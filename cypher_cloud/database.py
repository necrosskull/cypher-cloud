from sqlalchemy.ext.asyncio import AsyncSession, create_async_engine
from sqlalchemy.orm import declarative_base, sessionmaker

from cypher_cloud.config import get_db_url

DATABASE_URL = get_db_url()
print(DATABASE_URL)

engine = create_async_engine(DATABASE_URL, echo=False, future=True)

Base = declarative_base()

async_session = sessionmaker(engine, expire_on_commit=False, class_=AsyncSession)


async def get_db():
    async with async_session() as session:
        yield session
