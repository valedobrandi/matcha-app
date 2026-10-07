import logging

import main
from core.log_redaction import RedactCredentialsFilter

WEBSOCKET_LINE = '%s - "WebSocket %s" [accepted]'
ACCESS_LINE = '%s - "%s %s HTTP/%s" %d'


def logged(path: str) -> str:
    record = logging.LogRecord("uvicorn.error", logging.INFO, __file__, 1, WEBSOCKET_LINE, ("1.2.3.4:5", path), None)
    RedactCredentialsFilter().filter(record)
    return record.getMessage()


def test_should_hide_the_websocket_token_when_the_logged_path_carries_it():
    assert logged("/ws?token=eyJhbGciOiJIUzI1NiJ9.eyJzdWIiOiIxIn0.c2ln") == (
        '1.2.3.4:5 - "WebSocket /ws?token=<redacted>" [accepted]'
    )


def test_should_hide_the_oauth_code_and_the_verification_token_when_a_path_carries_them():
    assert logged("/auth/callback/42?code=one-time-code") == (
        '1.2.3.4:5 - "WebSocket /auth/callback/42?code=<redacted>" [accepted]'
    )
    assert logged("/auth/verify/abc123verify") == '1.2.3.4:5 - "WebSocket /auth/verify/<redacted>" [accepted]'


def test_should_keep_every_other_part_of_the_path_when_a_credential_is_hidden():
    assert logged("/x?a=1&token=t0k3n&b=2") == '1.2.3.4:5 - "WebSocket /x?a=1&token=<redacted>&b=2" [accepted]'
    assert logged("/discovery/suggest?limit=20&offset=0") == (
        '1.2.3.4:5 - "WebSocket /discovery/suggest?limit=20&offset=0" [accepted]'
    )


def test_should_redact_what_the_uvicorn_loggers_print_when_the_app_is_loaded(caplog):
    caplog.set_level(logging.INFO)

    logging.getLogger("uvicorn.error").info(WEBSOCKET_LINE, "1.2.3.4:5", "/ws?token=secret.jwt.value")
    logging.getLogger("uvicorn.access").info(ACCESS_LINE, "1.2.3.4:5", "GET", "/auth/verify/secretverify", "1.1", 200)

    assert "secret" not in caplog.text
    assert "/ws?token=<redacted>" in caplog.text
    assert "/auth/verify/<redacted>" in caplog.text
