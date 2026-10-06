import os

os.environ["DATABASE_URL"] = "sqlite://"
os.environ["SECRET_KEY"] = "warehouse-tests-only-secret-long-enough"

import pytest
from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from sqlalchemy.pool import StaticPool

from app.core.database import Base, get_db
from app.main import app
from app.models import Location, Product, User
from app.models.location import LocationType
from app.models.user import UserRole
from app.core.security import create_access_token


@pytest.fixture
def client():
    engine = create_engine(
        "sqlite://",
        connect_args={"check_same_thread": False},
        poolclass=StaticPool,
    )
    TestingSession = sessionmaker(autocommit=False, autoflush=False, bind=engine)
    app.state.testing_session = TestingSession
    Base.metadata.create_all(bind=engine)

    def override_get_db():
        db = TestingSession()
        try:
            yield db
        finally:
            db.close()

    app.dependency_overrides[get_db] = override_get_db
    with TestingSession() as db:
        db.add_all([
            User(employee_id="E-ADMIN", name="Admin", username="admin", password_hash="unused", role=UserRole.ADMIN),
            User(employee_id="E-WH", name="Warehouse", username="warehouse", password_hash="unused", role=UserRole.WAREHOUSE),
            User(employee_id="E-FL", name="Forklift", username="forklift", password_hash="unused", role=UserRole.FORKLIFT),
            User(employee_id="E-QC", name="Quality", username="qc", password_hash="unused", role=UserRole.QC),
            User(employee_id="E-SUP", name="Supervisor", username="supervisor", password_hash="unused", role=UserRole.SUPERVISOR),
            Product(product_code="SKU-1", product_name="Test product"),
            Location(location_code="RACK-A", qr_code_value="QR-RACK-A", location_type=LocationType.RACK),
            Location(location_code="RACK-B", qr_code_value="QR-RACK-B", location_type=LocationType.RACK),
        ])
        db.commit()
    with TestClient(app) as test_client:
        yield test_client
    app.dependency_overrides.clear()
    Base.metadata.drop_all(bind=engine)
    engine.dispose()


@pytest.fixture
def token(client):
    def login(username):
        return create_access_token({"sub": username, "role": "TEST"})
    return login


@pytest.fixture
def auth(token):
    return lambda username: {"Authorization": f"Bearer {token(username)}"}


@pytest.fixture
def db_session(client):
    with app.state.testing_session() as db:
        yield db
