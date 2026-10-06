"""The YouTube search page. What it calls lives in `search_api`."""

from __future__ import annotations

import re

import flask_babel
from flask import render_template, request
from flask_smorest import Blueprint

from pikaraoke.lib.auth import public
from pikaraoke.lib.current_app import get_karaoke_instance, get_site_name
from pikaraoke.lib.youtube_dl import get_search_results

_ = flask_babel.gettext

search_bp = Blueprint("search", __name__)

_HAN_RE = re.compile(r"[\u4e00-\u9fff\u3400-\u4dbf\uf900-\ufaff]")


def karaoke_query(search_string: str, chinese_keyword: str) -> str:
    """The YouTube query that favours karaoke uploads of the searched song.

    Taiwan KTV uploads are titled "KTV" or "伴唱" far more often than "karaoke",
    so requiring "karaoke" on a Chinese query filters out the very videos wanted.
    """
    keyword = chinese_keyword.strip() if _HAN_RE.search(search_string) else ""
    # Quoting makes the term a hard requirement, not a ranking hint:
    # 91% karaoke results against 82% unquoted, over 60 tail results.
    return f'{search_string} "{keyword or "karaoke"}"'


@search_bp.route("/search", methods=["GET"])
@public
def search():
    """YouTube search page."""
    k = get_karaoke_instance()
    site_name = get_site_name()
    search_string = request.args.get("search_string")
    if search_string:
        non_karaoke = request.args.get("non_karaoke") == "true"
        if non_karaoke:
            search_results = get_search_results(search_string)
        else:
            chinese_keyword = k.preferences.get_or_default("chinese_search_keyword")
            search_results = get_search_results(karaoke_query(search_string, chinese_keyword))
    else:
        search_string = None
        search_results = None
    # A result already on this machine gets a queue action instead of a pointless
    # second download. One indexed query for the page, not one per result.
    library_matches = (
        k.db.get_paths_by_youtube_ids([r.video_id for r in search_results])
        if search_results
        else {}
    )
    return render_template(
        "search.html",
        site_title=site_name,
        # MSG: Title of the page used to get new songs into the library.
        title=_("Add New"),
        search_results=search_results,
        search_string=search_string,
        library_matches=library_matches,
    )
