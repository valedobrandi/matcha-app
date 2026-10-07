import logging
import re

_CREDENTIAL = re.compile(r"((?:[?&](?:token|code)=)|(?:/auth/verify/))[^&/?\s\"]+")


class RedactCredentialsFilter(logging.Filter):
    def filter(self, record: logging.LogRecord) -> bool:
        if isinstance(record.args, tuple):
            record.args = tuple(
                _CREDENTIAL.sub(r"\1<redacted>", arg) if isinstance(arg, str) else arg
                for arg in record.args
            )
        return True
