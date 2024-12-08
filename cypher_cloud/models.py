from cypher_cloud.database import Base
from sqlalchemy import Column, Integer, String, Boolean, ForeignKey, LargeBinary
from sqlalchemy.orm import relationship

class User(Base):
    __tablename__ = 'users'

    id = Column(Integer, primary_key=True, index=True)
    email = Column(String, unique=True, index=True, nullable=False)
    hashed_password = Column(String, nullable=False)
    totp_secret = Column(String, nullable=True)
    is_active = Column(Boolean, default=True)

    files = relationship("File", back_populates="owner")

class File(Base):
    __tablename__ = 'files'

    id = Column(Integer, primary_key=True, index=True)
    owner_id = Column(Integer, ForeignKey('users.id', ondelete='CASCADE'))
    filename = Column(String, index=True, nullable=False)
    encrypted_key = Column(LargeBinary, nullable=False)
    storage_path = Column(String, nullable=False)

    owner = relationship("User", back_populates="files")
