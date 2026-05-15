from fastapi.responses import JSONResponse


def ok(data, message: str = "Success", status_code: int = 200):
    return JSONResponse(status_code=status_code, content={"data": data, "message": message})
