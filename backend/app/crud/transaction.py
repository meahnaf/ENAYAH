from sqlalchemy.orm import Session
from app.models.transaction import Transaction
from app.schemas.transaction import TransactionCreate
from typing import List, Optional


def create_transaction(db: Session, transaction: TransactionCreate, user_id: int) -> Transaction:
    values = transaction.model_dump(exclude={"metadata"})
    db_transaction = Transaction(
        **values,
        event_metadata=transaction.metadata,
        user_id=user_id
    )
    db.add(db_transaction)
    db.flush()
    db.refresh(db_transaction)
    return db_transaction


def get_transactions(db: Session, skip: int = 0, limit: int = 100):
    return db.query(Transaction).order_by(Transaction.timestamp.desc()).offset(skip).limit(limit).all()


def get_pallet_transactions(db: Session, pallet_id: int) -> List[Transaction]:
    return db.query(Transaction).filter(Transaction.pallet_id == pallet_id).order_by(Transaction.timestamp.desc()).all()


def get_user_transactions(db: Session, user_id: int, skip: int = 0, limit: int = 100):
    return db.query(Transaction).filter(Transaction.user_id == user_id).order_by(Transaction.timestamp.desc()).offset(skip).limit(limit).all()
