import pytest
from app.security import safe_next


@pytest.mark.parametrize("target", ["https://outside.example/", "//outside.example/path", "/\\outside.example", "/\n/path", "javascript:alert(1)", "", None])
def test_login_redirect_cannot_leave_origin(target):
    assert safe_next(target) is None


def test_local_redirect_preserves_path():
    assert safe_next("/appointments/A_GP") == "/appointments/A_GP"
