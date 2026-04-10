"""Monkey-patch for twikit's x_client_transaction.

Upstream twikit (2.3.3) hardcodes a regex that assumes the ondemand.s chunk
hash is present as '"ondemand.s":"HASH"' in the HTML. In 2026 X restructured
the webpack manifest so the hash now lives in a two-step chunk map:

    ...,20113:"ondemand.s",20226:"react-syntax-highlighter...",...   (id→name)
    ...,20113:"2c5bb94",...                                            (id→hash)

This patch rewrites ClientTransaction.get_indices to:
1. find the chunk id for "ondemand.s"
2. find the hash associated with that id
3. fetch the ondemand.s JS and extract KEY_BYTE indices as before

Import this module BEFORE creating any twikit Client.
"""
from __future__ import annotations

import re

import twikit.x_client_transaction.transaction as T


_CHUNK_NAME_PAT = re.compile(r'(\d+)\s*:\s*["\']ondemand\.s["\']')


async def _patched_get_indices(self, home_page_response, session, headers):
    text = str(T.ClientTransaction.validate_response(self, home_page_response)
               or self.home_page_response)

    # Step 1: find chunk id for "ondemand.s"
    m_name = _CHUNK_NAME_PAT.search(text)
    if not m_name:
        # Fall back to the original upstream behaviour (likely also fails)
        m_orig = T.ON_DEMAND_FILE_REGEX.search(text)
        if not m_orig:
            raise Exception("Couldn't get KEY_BYTE indices (ondemand.s chunk id not found)")
        ondemand_hash = m_orig.group(1)
    else:
        chunk_id = m_name.group(1)
        # Step 2: find hash for that chunk id. Hash map entries look like:
        #   {chunk_id}:"HEX"    (content-hash)
        # but we need the one in the hash map, not the name map. Names are
        # longer strings; hashes are short hex (6-10 chars).
        hash_pat = re.compile(rf'{chunk_id}\s*:\s*["\']([a-f0-9]{{6,12}})["\']')
        matches = hash_pat.findall(text)
        # Filter out any that look like chunk names (contain non-hex)
        hex_only = [h for h in matches if re.fullmatch(r'[a-f0-9]+', h)]
        if not hex_only:
            raise Exception(f"Couldn't find content hash for chunk {chunk_id}")
        ondemand_hash = hex_only[0]

    on_demand_file_url = (
        f"https://abs.twimg.com/responsive-web/client-web/"
        f"ondemand.s.{ondemand_hash}a.js"
    )
    on_demand_response = await session.request(
        method="GET", url=on_demand_file_url, headers=headers
    )

    key_byte_indices = []
    for item in T.INDICES_REGEX.finditer(str(on_demand_response.text)):
        key_byte_indices.append(item.group(2))

    if not key_byte_indices:
        raise Exception(
            "Couldn't get KEY_BYTE indices (ondemand.s fetched but regex failed)"
        )

    key_byte_indices = list(map(int, key_byte_indices))
    return key_byte_indices[0], key_byte_indices[1:]


# Apply patch at import time
T.ClientTransaction.get_indices = _patched_get_indices
