import mimetypes


def detect_message_type(file):
    mime, _ = mimetypes.guess_type(file.name)

    if not mime:
        return "FILE"

    if mime.startswith("image"):
        return "IMAGE"
    elif mime.startswith("video"):
        return "VIDEO"
    else:
        return "FILE"
