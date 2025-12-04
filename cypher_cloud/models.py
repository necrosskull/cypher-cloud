from sqlalchemy import Boolean, Column, ForeignKey, Integer, String
from sqlalchemy.orm import relationship

from cypher_cloud.database import Base


class User(Base):
    __tablename__ = "users"

    id = Column(Integer, primary_key=True, index=True)
    email = Column(String, unique=True, index=True, nullable=False)
    hashed_password = Column(String, nullable=False)
    totp_secret = Column(String, nullable=True)
    is_active = Column(Boolean, default=True)
    email_confirmed = Column(Boolean, default=False)

    files = relationship("File", back_populates="owner")
    passkeys = relationship("Passkey", back_populates="owner", cascade="all, delete-orphan")


class File(Base):
    __tablename__ = "files"

    id = Column(Integer, primary_key=True, index=True)
    owner_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"))
    filename = Column(String, index=True, nullable=False)
    vault_key_path = Column(String, nullable=False)
    storage_path = Column(String, nullable=False)

    owner = relationship("User", back_populates="files")


class Passkey(Base):
    __tablename__ = "passkeys"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"))
    credential_id = Column(String, unique=True, nullable=False, index=True)
    public_key = Column(String, nullable=False)
    sign_count = Column(Integer, default=0)
    user_handle = Column(String, nullable=False)
    nickname = Column(String, nullable=True)
    transports = Column(String, nullable=True)

    owner = relationship("User", back_populates="passkeys")
