from sqlalchemy.orm import Session
from app.core.database import SessionLocal
from app.models import User, Product, Location, Pallet, UserRole, LoadType, PalletStatus, LocationType
from app.core.security import get_password_hash
from datetime import datetime, timedelta, timezone
from app.core.config import settings
import os

def seed_database():
    db = SessionLocal()
    
    try:
        print("Seeding database...")
        
        admin_user = db.query(User).filter(User.role == UserRole.ADMIN, User.active.is_(True)).first()
        if admin_user is None:
            username = os.getenv("BOOTSTRAP_ADMIN_USERNAME")
            password = os.getenv("BOOTSTRAP_ADMIN_PASSWORD")
            employee_id = os.getenv("BOOTSTRAP_ADMIN_EMPLOYEE_ID")
            name = os.getenv("BOOTSTRAP_ADMIN_NAME")
            if not all((username, password, employee_id, name)):
                raise RuntimeError("Set BOOTSTRAP_ADMIN_USERNAME, BOOTSTRAP_ADMIN_PASSWORD, BOOTSTRAP_ADMIN_EMPLOYEE_ID, and BOOTSTRAP_ADMIN_NAME for first startup")
            if len(password) < 8 or len(password) > 72:
                raise RuntimeError("BOOTSTRAP_ADMIN_PASSWORD must be 8-72 characters")
            admin_user = User(
                employee_id=employee_id, name=name, username=username,
                password_hash=get_password_hash(password), role=UserRole.ADMIN, active=True,
            )
            db.add(admin_user)
        db.commit()
        
        # Create products
        products = [
            Product(
                product_code="PROD001",
                product_name="Product A",
                description="Standard warehouse product",
                active=True
            ),
            Product(
                product_code="PROD002",
                product_name="Product B",
                description="QC-controlled product",
                active=True
            ),
            Product(
                product_code="PROD003",
                product_name="Product C",
                description="Direct-out product",
                active=True
            ),
        ]
        
        for product in products:
            if not db.query(Product).filter(Product.product_code == product.product_code).first():
                db.add(product)
        db.commit()

        product_a = db.query(Product).filter(Product.product_code == "PROD001").first()
        product_b = db.query(Product).filter(Product.product_code == "PROD002").first()
        product_c = db.query(Product).filter(Product.product_code == "PROD003").first()
        if not all((admin_user, product_a, product_b, product_c)):
            raise RuntimeError("Required demo users or products could not be created")
        
        print(f"Created {len(products)} products")
        
        # Create locations
        locations = []
        for zone in ['A', 'B']:
            for rack in range(1, 4):
                for level in range(1, 3):
                    for position in range(1, 4):
                        location_code = f"{zone}-{rack:02d}-{level:02d}-{position:02d}"
                        location = Location(
                            location_code=location_code,
                            zone=zone,
                            rack=str(rack),
                            level=str(level),
                            position=str(position),
                            location_type=LocationType.RACK,
                            qr_code_value=location_code,
                            active=True,
                            occupied=False
                        )
                        if not db.query(Location).filter(Location.location_code == location_code).first():
                            locations.append(location)
        
        for location in locations:
            db.add(location)
        db.commit()

        rack_a = db.query(Location).filter(Location.location_code == "A-01-01-01").first()
        rack_b = db.query(Location).filter(Location.location_code == "A-01-01-02").first()
        rack_c = db.query(Location).filter(Location.location_code == "A-01-01-03").first()
        
        print(f"Created {len(locations)} locations")
        
        # Create sample pallets
        pallets = [
            Pallet(
                pallet_id="PAL-00125",
                load_number="LOAD-001",
                product_id=product_a.id,
                batch_number="B260928",
                quantity=1200,
                load_type=LoadType.STORAGE,
                production_datetime=datetime.now(timezone.utc) - timedelta(hours=2),
                received_datetime=datetime.now(timezone.utc) - timedelta(hours=2),
                wrapped_datetime=datetime.now(timezone.utc) - timedelta(hours=1),
                ready_for_putaway_datetime=datetime.now(timezone.utc) - timedelta(minutes=30),
                expected_release_datetime=datetime.now(timezone.utc) + timedelta(hours=settings.DEFAULT_HOLD_PERIOD_HOURS - 2),
                status=PalletStatus.READY_FOR_PUTAWAY,
                assigned_location_id=rack_c.id,
                created_by=admin_user.id
            ),
            Pallet(
                pallet_id="PAL-00126",
                load_number="LOAD-002",
                product_id=product_a.id,
                batch_number="B260929",
                quantity=800,
                load_type=LoadType.STORAGE,
                production_datetime=datetime.now(timezone.utc) - timedelta(hours=3),
                received_datetime=datetime.now(timezone.utc) - timedelta(hours=3),
                wrapped_datetime=datetime.now(timezone.utc) - timedelta(hours=2),
                ready_for_putaway_datetime=datetime.now(timezone.utc) - timedelta(hours=1),
                putaway_datetime=datetime.now(timezone.utc) - timedelta(minutes=45),
                expected_release_datetime=datetime.now(timezone.utc) + timedelta(hours=settings.DEFAULT_HOLD_PERIOD_HOURS - 3),
                status=PalletStatus.IN_RACK_HOLD,
                current_location_id=rack_a.id,
                created_by=admin_user.id
            ),
            Pallet(
                pallet_id="PAL-00127",
                load_number="LOAD-003",
                product_id=product_b.id,
                batch_number="B260930",
                quantity=1500,
                load_type=LoadType.STORAGE,
                production_datetime=datetime.now(timezone.utc) - timedelta(hours=50),
                received_datetime=datetime.now(timezone.utc) - timedelta(hours=50),
                wrapped_datetime=datetime.now(timezone.utc) - timedelta(hours=49),
                ready_for_putaway_datetime=datetime.now(timezone.utc) - timedelta(hours=48),
                putaway_datetime=datetime.now(timezone.utc) - timedelta(hours=47),
                expected_release_datetime=datetime.now(timezone.utc) - timedelta(hours=2),
                status=PalletStatus.IN_RACK_HOLD,
                current_location_id=rack_b.id,
                created_by=admin_user.id
            ),
            Pallet(
                pallet_id="PAL-00128",
                load_number="LOAD-004",
                product_id=product_c.id,
                batch_number="B260931",
                quantity=600,
                load_type=LoadType.DIRECT_OUT,
                production_datetime=datetime.now(timezone.utc) - timedelta(hours=1),
                received_datetime=datetime.now(timezone.utc) - timedelta(hours=1),
                status=PalletStatus.DISPATCH_READY,
                created_by=admin_user.id
            ),
        ]
        
        for pallet in pallets:
            if not db.query(Pallet).filter(Pallet.pallet_id == pallet.pallet_id).first():
                db.add(pallet)
        db.commit()
        
        print(f"Created {len(pallets)} pallets")
        
        # Update occupied locations
        if rack_a and rack_b:
            db.query(Location).filter(Location.id.in_([rack_a.id, rack_b.id])).update({"occupied": True})
        db.commit()
        
        print("Database seeded successfully!")
        
    except Exception as e:
        print(f"Error seeding database: {e}")
        db.rollback()
        raise
    finally:
        db.close()

if __name__ == "__main__":
    seed_database()
