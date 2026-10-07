"""Extract only explicitly allowed form fields; never pass CSRF or submit to domain code."""
def data_for(form, names):
    values = {}
    for name in names.split():
        value = getattr(form, name).data
        if isinstance(value, str):
            value = value.strip()
        values[name] = value
    return values


def run_form_action(form, action):
    """Keep submitted values on the same form when a domain rule rejects them."""
    from mysql.connector import Error as MySQLError
    from ..services.common import BusinessError

    try:
        return True, action()
    except BusinessError as error:
        form.general_errors = [str(error)]
    except MySQLError as error:
        if error.errno == 1644 and error.msg.startswith("CLINIC: "):
            form.general_errors = [error.msg[8:]]
        elif error.errno == 1062:
            form.general_errors = ["Thông tin đã tồn tại. Vui lòng kiểm tra tên đăng nhập, email hoặc mã định danh."]
        elif error.errno in (1452, 3819):
            form.general_errors = ["Thông tin không đúng định dạng hoặc không đáp ứng ràng buộc. Vui lòng kiểm tra lại."]
        else:
            raise
    return False, None
