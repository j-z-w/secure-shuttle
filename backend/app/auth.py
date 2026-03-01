from fastapi import Header

from app.exceptions import AuthenticationRequiredError


def get_actor_user_id(x_user_id: str | None = Header(default=None)) -> str:
    """
    Auth-provider-agnostic actor identity hook.
    Upstream auth middleware (e.g., Clerk) should map the verified user id
    into X-User-Id before this dependency is invoked.
    """
    if not x_user_id:
        raise AuthenticationRequiredError()
    return x_user_id.strip()


def get_actor_is_admin(x_user_role: str | None = Header(default=None)) -> bool:
    if not x_user_role:
        return False
    return x_user_role.strip().lower() == "admin"
