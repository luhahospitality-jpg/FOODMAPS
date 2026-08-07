#!/usr/bin/env python3
"""One-time migration: v1 (Top5-only) schema -> v2 (tags/rank/reservable/tier) schema.
Mechanical only -- derives tags from existing source_type/distinction, never invents data.
"""
import json
import glob

TIER_S = {
    "nueva-york", "paris", "tokio", "roma", "madrid", "ciudad-de-mexico",
    "buenos-aires", "londres", "barcelona", "bangkok",
}
TIER_M = {
    "los-angeles", "lima", "sao-paulo", "estambul", "seul", "milan",
}
TIER_TARGET = {"S": 100, "M": 60, "N": 40}


def tier_for(slug: str) -> str:
    if slug in TIER_S:
        return "S"
    if slug in TIER_M:
        return "M"
    return "N"


def derive_tags(place: dict) -> list[str]:
    tags: list[str] = []
    dist = place.get("distinction")
    if dist:
        if dist.get("type") in ("michelin_star", "michelin_bib_gourmand"):
            tags.append("michelin")
        if dist.get("type") == "michelin_bib_gourmand":
            tags.append("bib_gourmand")
        if dist.get("type") == "repsol_sol":
            tags.append("repsol")

    source_map = {
        "bourdain": "bourdain",
        "critic": "critic",
        "classic": "clasico",
        "timeout": "timeout",
        "influencer": "influencer",
        "tv_show": "tv_show",
        "viral_social": "viral_tiktok",
    }
    for key in ("source_type", "source_type_secondary"):
        st = place.get(key)
        if st and source_map.get(st) and source_map[st] not in tags:
            tags.append(source_map[st])

    return tags


def migrate_city_file(path: str) -> None:
    with open(path, encoding="utf-8") as f:
        data = json.load(f)

    slug = data["slug"]
    tier = tier_for(slug)
    places = data["places"]

    # Rank: preserve existing top5_rank order first, then continue
    # sequentially for whatever followed in original array order.
    top5 = sorted(
        (p for p in places if p.get("is_top5")),
        key=lambda p: p.get("top5_rank") or 0,
    )
    rest = [p for p in places if not p.get("is_top5")]
    ordered = top5 + rest

    new_places = []
    for i, p in enumerate(ordered, start=1):
        tags = derive_tags(p)
        google_maps_url = p.get("google_maps_url")
        if not google_maps_url and p.get("lat") is not None and p.get("lng") is not None:
            google_maps_url = (
                f"https://www.google.com/maps/search/?api=1&query={p['lat']},{p['lng']}"
            )
        new_place = {
            "name": p["name"],
            "place_id": p.get("place_id"),
            "lat": p["lat"],
            "lng": p["lng"],
            "category": p["category"],
            "cuisine": p.get("cuisine"),
            "tags": tags,
            "description": p["description"],
            "source_url": p.get("source_url"),
            "source_type": p.get("source_type"),
            "rank": i,
            "reservable": None,
            "google_maps_url": google_maps_url,
        }
        if p.get("source_type_secondary"):
            new_place["source_type_secondary"] = p["source_type_secondary"]
        if p.get("distinction"):
            new_place["distinction"] = p["distinction"]
        new_places.append(new_place)

    data["places"] = new_places
    data["totalPlaces"] = len(new_places)
    data["targetPlaces"] = TIER_TARGET[tier]
    data["tier"] = tier

    with open(path, "w", encoding="utf-8") as f:
        json.dump(data, f, ensure_ascii=False, indent=2)
        f.write("\n")


def main():
    files = sorted(glob.glob("src/data/cities/*.json"))
    for path in files:
        migrate_city_file(path)
        print("migrated", path)
    print(f"\nDone. {len(files)} files migrated.")


if __name__ == "__main__":
    main()
