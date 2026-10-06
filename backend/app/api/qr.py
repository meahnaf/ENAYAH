from fastapi import APIRouter, Depends, HTTPException
from fastapi.responses import Response
from sqlalchemy.orm import Session
from typing import List
import qrcode
import io
from app.core.database import get_db
from app.crud.location import get_locations
from app.core.deps import get_current_active_user, require_role
from app.models.user import User as UserModel, UserRole

router = APIRouter()


@router.get("/locations/{location_id}/qr")
async def generate_location_qr(
    location_id: int,
    db: Session = Depends(get_db),
    current_user: UserModel = Depends(get_current_active_user)
):
    from app.crud.location import get_location
    location = get_location(db, location_id)
    if not location:
        raise HTTPException(status_code=404, detail="Location not found")
    
    qr_value = location.qr_code_value or location.location_code
    
    # Generate QR code
    qr = qrcode.QRCode(
        version=1,
        error_correction=qrcode.constants.ERROR_CORRECT_L,
        box_size=10,
        border=4,
    )
    qr.add_data(qr_value)
    qr.make(fit=True)
    
    img = qr.make_image(fill_color="black", back_color="white")
    
    # Convert to bytes
    img_byte_arr = io.BytesIO()
    img.save(img_byte_arr, format='PNG')
    img_byte_arr.seek(0)
    
    return Response(content=img_byte_arr.getvalue(), media_type="image/png")


@router.get("/locations/batch-qr")
async def generate_batch_qr(
    skip: int = 0,
    limit: int = 100,
    db: Session = Depends(get_db),
    current_user: UserModel = Depends(require_role(UserRole.ADMIN, UserRole.SUPERVISOR))
):
    from reportlab.lib.pagesizes import letter
    from reportlab.lib import colors
    from reportlab.platypus import SimpleDocTemplate, Table, TableStyle, Paragraph
    from reportlab.lib.styles import getSampleStyleSheet
    from reportlab.lib.units import inch
    
    locations = get_locations(db, skip=skip, limit=limit)
    
    # Create PDF
    buffer = io.BytesIO()
    doc = SimpleDocTemplate(buffer, pagesize=letter)
    elements = []
    
    # Create table with QR codes
    data = []
    for i in range(0, len(locations), 2):
        row = []
        for j in range(2):
            if i + j < len(locations):
                loc = locations[i + j]
                # Generate QR code for this location
                qr_value = loc.qr_code_value or loc.location_code
                qr = qrcode.QRCode(
                    version=1,
                    error_correction=qrcode.constants.ERROR_CORRECT_L,
                    box_size=4,
                    border=2,
                )
                qr.add_data(qr_value)
                qr.make(fit=True)
                img = qr.make_image(fill_color="black", back_color="white")
                
                # Convert to bytes
                img_byte_arr = io.BytesIO()
                img.save(img_byte_arr, format='PNG')
                img_byte_arr.seek(0)
                
                from reportlab.lib.utils import ImageReader
                row.append([
                    Paragraph(f"<b>{loc.location_code}</b>", getSampleStyleSheet()['Normal']),
                    ImageReader(img_byte_arr),
                    Paragraph(f"Zone: {loc.zone or 'N/A'}<br/>Rack: {loc.rack or 'N/A'}<br/>Level: {loc.level or 'N/A'}", getSampleStyleSheet()['Normal'])
                ])
            else:
                row.append(['', '', ''])
        data.append(row)
    
    # Create table
    table = Table(data, colWidths=[2*inch, 1.5*inch, 2*inch])
    table.setStyle(TableStyle([
        ('ALIGN', (0, 0), (-1, -1), 'CENTER'),
        ('VALIGN', (0, 0), (-1, -1), 'MIDDLE'),
        ('FONTNAME', (0, 0), (-1, 0), 'Helvetica-Bold'),
        ('FONTSIZE', (0, 0), (-1, 0), 12),
        ('BOTTOMPADDING', (0, 0), (-1, 0), 12),
        ('BACKGROUND', (0, 0), (-1, 0), colors.grey),
        ('GRID', (0, 0), (-1, -1), 1, colors.black),
    ]))
    
    elements.append(table)
    doc.build(elements)
    
    buffer.seek(0)
    return Response(content=buffer.getvalue(), media_type="application/pdf")
