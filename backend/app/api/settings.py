from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel, Field
from sqlalchemy.orm import Session
from zoneinfo import ZoneInfo, ZoneInfoNotFoundError

from app.core.database import get_db
from app.core.deps import require_role
from app.models.setting import SystemSetting
from app.models.user import User, UserRole

router = APIRouter()


class SettingsUpdate(BaseModel):
    storage_hold_period_hours: int = Field(ge=1, le=720)
    qc_hold_target_hours: int = Field(ge=1, le=720)
    warehouse_timezone: str = Field(min_length=1, max_length=100)


@router.get("/")
def read_settings(db: Session = Depends(get_db), _: User = Depends(require_role(UserRole.ADMIN))):
    rows = {row.key: row.value for row in db.query(SystemSetting).all()}
    return {
        "storage_hold_period_hours": int(rows.get("storage_hold_period_hours", "48")),
        "qc_hold_target_hours": int(rows.get("qc_hold_target_hours", "24")),
        "warehouse_timezone": rows.get("warehouse_timezone", "Asia/Riyadh"),
    }


@router.put("/")
def update_settings(payload: SettingsUpdate, db: Session = Depends(get_db), _: User = Depends(require_role(UserRole.ADMIN))):
    try:
        ZoneInfo(payload.warehouse_timezone)
    except ZoneInfoNotFoundError:
        raise HTTPException(status_code=422, detail="Unknown IANA timezone")
    values = payload.model_dump()
    for key, value in values.items():
        row = db.get(SystemSetting, key)
        if row is None:
            row = SystemSetting(key=key, value=str(value))
            db.add(row)
        else:
            row.value = str(value)
    db.commit()
    return values
