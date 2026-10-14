
def test_health_and_exercise_library(client):
    assert client.get("/healthz").status_code == 200
    response = client.get("/api/v1/exercises")
    assert response.status_code == 200
    assert [item["code"] for item in response.json()] == [
        "elbow-flexion", "shoulder-abduction", "seated-knee-extension"
    ]


def test_patient_can_register_start_finish_session_and_view_summary(client):
    token = client.post("/api/v1/auth/register", json={
        "email": "patient@example.com",
        "full_name": "Test Patient",
        "password": "StrongPassword123!",
        "role": "patient",
    }).json()["access_token"]
    headers = {"Authorization": f"Bearer {token}"}

    exercises = client.get("/api/v1/exercises").json()
    session_response = client.post("/api/v1/sessions", headers=headers, json={
        "exercise_id": exercises[0]["id"],
        "affected_side": "left",
    })
    assert session_response.status_code == 201, session_response.text
    session_id = session_response.json()["id"]

    measurement = client.post(f"/api/v1/sessions/{session_id}/rom-measurements", headers=headers, json={
        "measurements": [{
            "angle_deg": 92.5,
            "affected_side": "left",
            "phase": "peak_check",
            "target_reached": True,
        }]
    })
    assert measurement.status_code == 201, measurement.text
    assert len(measurement.json()) == 1

    finish = client.post(f"/api/v1/sessions/{session_id}/finish", headers=headers, json={
        "status": "completed",
        "total_repetitions": 8,
        "successful_repetitions": 7,
        "average_peak_rom_deg": 88.5,
        "maximum_peak_rom_deg": 94.0,
    })
    assert finish.status_code == 200, finish.text
    assert finish.json()["successful_repetitions"] == 7
    assert finish.json()["duration_seconds"] is not None

    summary = client.get("/api/v1/patients/1/analytics/summary?days=30", headers=headers)
    assert summary.status_code == 200, summary.text
    assert summary.json()["total_sessions"] == 1
    assert summary.json()["adherence_percent"] == 87.5


def test_patient_data_is_not_public(client):
    token = client.post("/api/v1/auth/register", json={
        "email": "patient@example.com",
        "full_name": "Test Patient",
        "password": "StrongPassword123!",
        "role": "patient",
    }).json()["access_token"]
    stranger = client.post("/api/v1/auth/register", json={
        "email": "stranger@example.com",
        "full_name": "Stranger",
        "password": "StrongPassword123!",
        "role": "patient",
    }).json()["access_token"]
    response = client.get("/api/v1/patients/1/analytics/summary", headers={"Authorization": f"Bearer {stranger}"})
    assert response.status_code == 403
    assert client.get("/api/v1/auth/me", headers={"Authorization": f"Bearer {token}"}).status_code == 200


def test_patient_grants_clinician_access_and_clinician_creates_prescription(client):
    patient_token = client.post("/api/v1/auth/register", json={
        "email": "patient@example.com",
        "full_name": "Test Patient",
        "password": "StrongPassword123!",
        "role": "patient",
    }).json()["access_token"]
    # Bootstrap an admin in the isolated test database, then provision a clinician through the admin API.
    from app.models import User, UserRole
    from app.security import hash_password
    factory = client.app.state.testing_session_factory
    with factory() as db:
        db.add(User(email="admin@example.com", full_name="Test Admin", password_hash=hash_password("AdminPassword123!"), role=UserRole.ADMIN))
        db.commit()
    admin_login = client.post("/api/v1/auth/login", json={"email": "admin@example.com", "password": "AdminPassword123!"})
    assert admin_login.status_code == 200, admin_login.text
    admin_headers = {"Authorization": f"Bearer {admin_login.json()['access_token']}"}
    staff = client.post("/api/v1/admin/users", headers=admin_headers, json={
        "email": "clinician@example.com",
        "full_name": "Test Clinician",
        "password": "StrongPassword123!",
        "role": "clinician",
    })
    assert staff.status_code == 201, staff.text
    clinician_token = client.post("/api/v1/auth/login", json={"email": "clinician@example.com", "password": "StrongPassword123!"}).json()["access_token"]
    patient_headers = {"Authorization": f"Bearer {patient_token}"}
    clinician_headers = {"Authorization": f"Bearer {clinician_token}"}

    denied = client.post("/api/v1/patients/1/prescriptions", headers=clinician_headers, json={
        "exercise_id": 2, "affected_side": "left", "target_rom_deg": 80
    })
    assert denied.status_code == 403

    access = client.post("/api/v1/patients/1/access", headers=patient_headers, json={
        "email": "clinician@example.com", "access_role": "clinician"
    })
    assert access.status_code == 201, access.text

    created = client.post("/api/v1/patients/1/prescriptions", headers=clinician_headers, json={
        "exercise_id": 2,
        "affected_side": "left",
        "target_rom_deg": 80,
        "rom_margin_deg": 5,
        "hold_seconds": 2,
        "target_repetitions": 10,
        "starts_on": "2026-10-13",
        "notes": "Target sesuai arahan praktisi.",
    })
    assert created.status_code == 201, created.text
    assert created.json()["exercise"]["code"] == "shoulder-abduction"


def test_pdf_report_endpoint(client):
    token = client.post("/api/v1/auth/register", json={
        "email": "patient@example.com",
        "full_name": "Test Patient",
        "password": "StrongPassword123!",
        "role": "patient",
    }).json()["access_token"]
    response = client.get("/api/v1/patients/1/reports/sessions.pdf", headers={"Authorization": f"Bearer {token}"})
    assert response.status_code == 200, response.text
    assert response.headers["content-type"].startswith("application/pdf")
    assert response.content[:4] == b"%PDF"


def test_password_change_invalidates_old_token(client):
    response = client.post("/api/v1/auth/register", json={
        "email": "patient@example.com",
        "full_name": "Test Patient",
        "password": "StrongPassword123!",
        "role": "patient",
    })
    old_token = response.json()["access_token"]
    old_headers = {"Authorization": f"Bearer {old_token}"}
    changed = client.post("/api/v1/users/me/password", headers=old_headers, json={
        "current_password": "StrongPassword123!",
        "new_password": "NewStrongPassword456!",
    })
    assert changed.status_code == 204, changed.text
    assert client.get("/api/v1/auth/me", headers=old_headers).status_code == 401
    logged_in = client.post("/api/v1/auth/login", json={
        "email": "patient@example.com",
        "password": "NewStrongPassword456!",
    })
    assert logged_in.status_code == 200, logged_in.text
