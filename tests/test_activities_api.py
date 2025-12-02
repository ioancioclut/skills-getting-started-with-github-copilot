import copy
import pytest
from fastapi.testclient import TestClient

from src import app as myapp


client = TestClient(myapp.app)


@pytest.fixture(autouse=True)
def reset_activities():
    # Make sure each test has a clean copy of the in-memory activities DB
    original = copy.deepcopy(myapp.activities)
    yield
    myapp.activities = original


def test_get_activities():
    response = client.get("/activities")
    assert response.status_code == 200
    data = response.json()
    assert isinstance(data, dict)
    assert "Chess Club" in data


def test_signup_and_unregister_flow():
    activity = "Chess Club"
    email = "teststudent@mergington.edu"

    # ensure not already present
    assert email not in myapp.activities[activity]["participants"]

    # signup
    r = client.post(f"/activities/{activity}/signup?email={email}")
    assert r.status_code == 200
    assert email in myapp.activities[activity]["participants"]

    # duplicate signup should fail
    r2 = client.post(f"/activities/{activity}/signup?email={email}")
    assert r2.status_code == 400

    # unregister
    r3 = client.post(f"/activities/{activity}/unregister?email={email}")
    assert r3.status_code == 200
    assert email not in myapp.activities[activity]["participants"]

    # unregistering again fails
    r4 = client.post(f"/activities/{activity}/unregister?email={email}")
    assert r4.status_code == 400
