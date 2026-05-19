from sqlalchemy.orm import Session
from app.models.widget import Widget
from app.models.user import User
from app.schemas.widget import WidgetCreate, WidgetUpdate
from app.utils.exceptions import NotFoundException


def get_widgets(db: Session, user: User) -> list[Widget]:
    return db.query(Widget).filter(Widget.owner_id == user.id).all()


def get_widget(db: Session, widget_id: int, user: User) -> Widget:
    item = (
        db.query(Widget)
        .filter(Widget.id == widget_id, Widget.owner_id == user.id)
        .first()
    )
    if not item:
        raise NotFoundException("Widget not found")
    return item


def create_widget(db: Session, data: WidgetCreate, user: User) -> Widget:
    item = Widget(**data.model_dump(), owner_id=user.id)
    db.add(item)
    db.commit()
    db.refresh(item)
    return item


def update_widget(db: Session, widget_id: int, data: WidgetUpdate, user: User) -> Widget:
    item = get_widget(db, widget_id, user)
    for key, value in data.model_dump(exclude_unset=True).items():
        setattr(item, key, value)
    db.commit()
    db.refresh(item)
    return item


def delete_widget(db: Session, widget_id: int, user: User) -> None:
    item = get_widget(db, widget_id, user)
    db.delete(item)
    db.commit()
