import asyncio
import logging
from typing import Optional

import hvac

from cypher_cloud.config import settings

logger = logging.getLogger(__name__)


def _create_client() -> hvac.Client:
    client = hvac.Client(url=settings.vault_addr, token=settings.vault_token)
    if not client.is_authenticated():
        raise RuntimeError("Failed to authenticate with Vault")
    return client


async def store_file_key(path: str, key: str) -> None:
    """Сохраняем ключ шифрования файла в Vault."""

    def _store() -> None:
        client = _create_client()
        client.secrets.kv.v2.create_or_update_secret(
            mount_point=settings.vault_kv_mount,
            path=path,
            secret={"key": key},
        )

    await asyncio.to_thread(_store)


async def fetch_file_key(path: str) -> str:
    """Читаем ключ шифрования файла из Vault."""

    def _read() -> str:
        client = _create_client()
        secret = client.secrets.kv.v2.read_secret_version(
            mount_point=settings.vault_kv_mount, path=path
        )
        data = secret["data"]["data"]
        key = data.get("key")
        if not key:
            raise RuntimeError(f"No key found in Vault at path {path}")
        return key

    return await asyncio.to_thread(_read)


async def delete_file_key(path: Optional[str]) -> None:
    """Удаляем ключ из Vault (best-effort)."""
    if not path:
        return

    def _delete() -> None:
        client = _create_client()
        try:
            client.secrets.kv.v2.delete_metadata_and_all_versions(
                mount_point=settings.vault_kv_mount, path=path
            )
        except Exception as exc:  # noqa: BLE001
            logger.warning("Failed to delete Vault secret %s: %s", path, exc)

    await asyncio.to_thread(_delete)
