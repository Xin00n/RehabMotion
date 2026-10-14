import pytest
from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from sqlalchemy.pool import StaticPool
from app.database import Base, get_db
from app.main import app
from app.seed import EXERCISES
from app.models import Exercise


@pytest.fixture()
def client():
    test_engine = create_engine(
        "sqlite://",
        connect_args={"check_same_thread": False},
        poolclass=StaticPool,
    )
    TestingSessionLocal = sessionmaker(bind=test_engine, autoflush=False, expire_on_commit=False)
    Base.metadata.create_all(bind=test_engine)

    def override_get_db():
        db = TestingSessionLocal()
        try:
            yield db
        finally:
            db.close()

    app.dependency_overrides[get_db] = override_get_db
    app.state.testing_session_factory = TestingSessionLocal
    with TestingSessionLocal() as db:
        for item in EXERCISES:
            db.add(Exercise(**item))
        db.commit()
    with TestClient(app) as test_client:
        yield test_client
    app.dependency_overrides.clear()
    if hasattr(app.state, "testing_session_factory"):
        delattr(app.state, "testing_session_factory")
    Base.metadata.drop_all(bind=test_engine)
    test_engine.dispose()


def register_and_login(client, email="patient@example.com", role="patient"):
    response = client.post("/api/v1/auth/register", json={
        "email": email,
        "full_name": "Test User",
        "password": "StrongPassword123!",
        "role": role,
    })
    assert response.status_code == 201, response.text
    return response.json()["access_token"]
