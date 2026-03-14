import logging
import random
import uuid
from datetime import datetime, timedelta
from typing import Dict, List, Optional

import httpx

from app.config import settings
from app.models.flight import Airport, FlightItinerary, FlightSearchParams, Leg

logger = logging.getLogger(__name__)

def _api_base() -> str:
    return f"https://{settings.flight_api_host}"

AIRLINES = [
    {"name": "British Airways",    "code": "BA"},
    {"name": "Emirates",           "code": "EK"},
    {"name": "Qatar Airways",      "code": "QR"},
    {"name": "Lufthansa",          "code": "LH"},
    {"name": "Air France",         "code": "AF"},
    {"name": "Turkish Airlines",   "code": "TK"},
    {"name": "KLM",                "code": "KL"},
    {"name": "Singapore Airlines", "code": "SQ"},
    {"name": "Delta Air Lines",    "code": "DL"},
    {"name": "United Airlines",    "code": "UA"},
    {"name": "American Airlines",  "code": "AA"},
    {"name": "Swiss International","code": "LX"},
]

# ── In-memory flight cache ────────────────────────────────────────────────────
# Populated each time search_flights() runs so that GET /api/flight-details
# can look up a flight by its ID without a second API call.
_flight_cache: Dict[str, FlightItinerary] = {}
_MAX_CACHE_SIZE = 500


def _cache_flights(flights: List[FlightItinerary]) -> None:
    for f in flights:
        _flight_cache[f.id] = f
    if len(_flight_cache) > _MAX_CACHE_SIZE:
        evict = list(_flight_cache.keys())[: len(_flight_cache) - _MAX_CACHE_SIZE]
        for k in evict:
            del _flight_cache[k]


def get_cached_flight(flight_id: str) -> Optional[FlightItinerary]:
    return _flight_cache.get(flight_id)


# ── Helpers ───────────────────────────────────────────────────────────────────

def _rapidapi_headers() -> dict:
    return {
        "x-rapidapi-key": settings.flight_api_key,
        "x-rapidapi-host": settings.flight_api_host,
    }


def _api_configured() -> bool:
    """
    Returns True when a real FLIGHT_API_KEY is set.
    When False the mock provider is used — no external calls are made.
    To swap to the live Skyscanner API: set FLIGHT_API_KEY=<your_key> in .env.
    """
    return bool(settings.flight_api_key and settings.flight_api_key != "your_api_key_here")


# ── Airport data ──────────────────────────────────────────────────────────────

ALL_AIRPORTS: List[Airport] = [
    Airport(skyId="LOND", entityId="27544008", name="London Heathrow Airport",               city="London",          country="United Kingdom",       iata="LHR"),
    Airport(skyId="LOND", entityId="27544008", name="London Gatwick Airport",                city="London",          country="United Kingdom",       iata="LGW"),
    Airport(skyId="NYCA", entityId="27537542", name="John F. Kennedy International",         city="New York",        country="United States",        iata="JFK"),
    Airport(skyId="NYCA", entityId="27537542", name="LaGuardia Airport",                     city="New York",        country="United States",        iata="LGA"),
    Airport(skyId="NYCA", entityId="27537542", name="Newark Liberty International",          city="Newark",          country="United States",        iata="EWR"),
    Airport(skyId="DUBB", entityId="27536737", name="Dubai International Airport",           city="Dubai",           country="United Arab Emirates", iata="DXB"),
    Airport(skyId="PARI", entityId="27539733", name="Charles de Gaulle Airport",             city="Paris",           country="France",               iata="CDG"),
    Airport(skyId="PARI", entityId="27539733", name="Orly Airport",                          city="Paris",           country="France",               iata="ORY"),
    Airport(skyId="FRAN", entityId="27539541", name="Frankfurt Airport",                     city="Frankfurt",       country="Germany",              iata="FRA"),
    Airport(skyId="AMST", entityId="27539627", name="Amsterdam Schiphol Airport",            city="Amsterdam",       country="Netherlands",          iata="AMS"),
    Airport(skyId="SING", entityId="27536559", name="Singapore Changi Airport",              city="Singapore",       country="Singapore",            iata="SIN"),
    Airport(skyId="TOKY", entityId="27536519", name="Narita International Airport",          city="Tokyo",           country="Japan",                iata="NRT"),
    Airport(skyId="TOKY", entityId="27536519", name="Haneda Airport",                        city="Tokyo",           country="Japan",                iata="HND"),
    Airport(skyId="SYDP", entityId="27536526", name="Sydney Kingsford Smith Airport",        city="Sydney",          country="Australia",            iata="SYD"),
    Airport(skyId="TORB", entityId="27537670", name="Toronto Pearson International",         city="Toronto",         country="Canada",               iata="YYZ"),
    Airport(skyId="MIAD", entityId="27537714", name="Miami International Airport",           city="Miami",           country="United States",        iata="MIA"),
    Airport(skyId="LOSA", entityId="27537675", name="Los Angeles International",             city="Los Angeles",     country="United States",        iata="LAX"),
    Airport(skyId="CHID", entityId="27537688", name="O'Hare International Airport",          city="Chicago",         country="United States",        iata="ORD"),
    Airport(skyId="MADD", entityId="27539557", name="Adolfo Suárez Madrid-Barajas",          city="Madrid",          country="Spain",                iata="MAD"),
    Airport(skyId="ROME", entityId="27539561", name="Leonardo da Vinci-Fiumicino",           city="Rome",            country="Italy",                iata="FCO"),
    Airport(skyId="BARC", entityId="27539566", name="Barcelona El Prat Airport",             city="Barcelona",       country="Spain",                iata="BCN"),
    Airport(skyId="MUMB", entityId="27536547", name="Chhatrapati Shivaji Maharaj International", city="Mumbai",     country="India",                iata="BOM"),
    Airport(skyId="DELH", entityId="27536548", name="Indira Gandhi International Airport",   city="Delhi",           country="India",                iata="DEL"),
    Airport(skyId="BKKA", entityId="27536551", name="Suvarnabhumi Airport",                  city="Bangkok",         country="Thailand",             iata="BKK"),
    Airport(skyId="ISTB", entityId="27539571", name="Istanbul Airport",                      city="Istanbul",        country="Turkey",               iata="IST"),
    Airport(skyId="DOHA", entityId="27536552", name="Hamad International Airport",           city="Doha",            country="Qatar",                iata="DOH"),
    Airport(skyId="ABUD", entityId="27536558", name="Abu Dhabi International Airport",       city="Abu Dhabi",       country="United Arab Emirates", iata="AUH"),
    Airport(skyId="JONG", entityId="27537644", name="OR Tambo International Airport",        city="Johannesburg",    country="South Africa",         iata="JNB"),
    Airport(skyId="CAIP", entityId="27536553", name="Cairo International Airport",           city="Cairo",           country="Egypt",                iata="CAI"),
    Airport(skyId="SANF", entityId="27537679", name="San Francisco International",           city="San Francisco",   country="United States",        iata="SFO"),
    Airport(skyId="SEAT", entityId="27537682", name="Seattle-Tacoma International",          city="Seattle",         country="United States",        iata="SEA"),
    Airport(skyId="BOST", entityId="27537685", name="Logan International Airport",           city="Boston",          country="United States",        iata="BOS"),
    Airport(skyId="WASH", entityId="27537689", name="Dulles International Airport",          city="Washington DC",   country="United States",        iata="IAD"),
    Airport(skyId="ZURC", entityId="27539575", name="Zurich Airport",                        city="Zurich",          country="Switzerland",          iata="ZRH"),
    Airport(skyId="COPE", entityId="27539602", name="Copenhagen Airport",                    city="Copenhagen",      country="Denmark",              iata="CPH"),
    Airport(skyId="STOC", entityId="27539605", name="Stockholm Arlanda Airport",             city="Stockholm",       country="Sweden",               iata="ARN"),
    Airport(skyId="OSLB", entityId="27539608", name="Oslo Gardermoen Airport",               city="Oslo",            country="Norway",               iata="OSL"),
    Airport(skyId="HELS", entityId="27539611", name="Helsinki Airport",                      city="Helsinki",        country="Finland",              iata="HEL"),
    Airport(skyId="ATHN", entityId="27539614", name="Athens International Airport",          city="Athens",          country="Greece",               iata="ATH"),
    Airport(skyId="LISB", entityId="27539617", name="Humberto Delgado Airport",              city="Lisbon",          country="Portugal",             iata="LIS"),
]

# IATA → city lookup
_IATA_CITY: Dict[str, str] = {a.iata: a.city for a in ALL_AIRPORTS}

# skyId → primary IATA code (first/main airport for that metro area)
_SKYID_IATA: Dict[str, str] = {}
_SKYID_CITY: Dict[str, str] = {}
for _a in ALL_AIRPORTS:
    if _a.skyId not in _SKYID_IATA:          # keep first match as primary
        _SKYID_IATA[_a.skyId] = _a.iata
        _SKYID_CITY[_a.skyId] = _a.city


def _iata_for(sky_id: str) -> str:
    return _SKYID_IATA.get(sky_id, sky_id[:3].upper())


def _city_for(sky_id: str) -> str:
    return _SKYID_CITY.get(sky_id, sky_id)


def _generate_mock_airports(query: str) -> List[Airport]:
    q = query.lower()
    return [
        a for a in ALL_AIRPORTS
        if q in a.city.lower()
        or q in a.name.lower()
        or q in a.iata.lower()
        or q in a.country.lower()
    ][:8]


# ── Mock flight generation ────────────────────────────────────────────────────

def _generate_mock_flights(params: FlightSearchParams) -> List[FlightItinerary]:
    random.seed(f"{params.origin_sky_id}{params.destination_sky_id}{params.date}")

    is_long_haul = params.origin_sky_id[:2] != params.destination_sky_id[:2]
    base_price    = random.randint(350, 800)  if is_long_haul else random.randint(80, 350)
    base_duration = random.randint(480, 780)  if is_long_haul else random.randint(60, 300)

    cabin_multipliers = {
        "economy":         1.0,
        "premium_economy": 2.2,
        "business":        4.5,
        "first":           8.0,
    }
    multiplier  = cabin_multipliers.get(params.cabin_class, 1.0)
    num_flights = random.randint(8, 12)
    flights: List[FlightItinerary] = []

    origin_iata = _iata_for(params.origin_sky_id)
    dest_iata   = _iata_for(params.destination_sky_id)
    origin_city = _city_for(params.origin_sky_id)
    dest_city   = _city_for(params.destination_sky_id)

    dep_dt = datetime.strptime(f"{params.date} 06:00", "%Y-%m-%d %H:%M")

    for i in range(num_flights):
        airline  = random.choice(AIRLINES)
        stops    = random.choice([0, 0, 0, 1, 1, 2])
        duration = base_duration + random.randint(-60, 120) + stops * random.randint(60, 90)
        price    = round((base_price + random.randint(-50, 200)) * multiplier, 2)

        hour_offset = i * 1.5 + random.uniform(-0.5, 0.5)
        departure   = dep_dt + timedelta(hours=hour_offset)
        arrival     = departure + timedelta(minutes=duration)
        flight_num  = f"{airline['code']} {random.randint(100, 999)}"

        outbound_leg = Leg(
            id=f"leg-{uuid.uuid4().hex[:8]}",
            flight_number=flight_num,
            origin=origin_iata,
            origin_city=origin_city,
            destination=dest_iata,
            destination_city=dest_city,
            departure=departure.isoformat(),
            arrival=arrival.isoformat(),
            duration_minutes=duration,
            stops=stops,
            carriers=[airline["name"]],
            carrier_logos=[],
        )

        legs = [outbound_leg]

        if params.return_date:
            ret_dep_dt  = datetime.strptime(f"{params.return_date} 08:00", "%Y-%m-%d %H:%M")
            ret_dep     = ret_dep_dt + timedelta(hours=random.uniform(0, 12))
            ret_dur     = base_duration + random.randint(-60, 120) + stops * random.randint(60, 90)
            ret_arr     = ret_dep + timedelta(minutes=ret_dur)
            ret_fn      = f"{airline['code']} {random.randint(100, 999)}"
            legs.append(Leg(
                id=f"leg-{uuid.uuid4().hex[:8]}",
                flight_number=ret_fn,
                origin=dest_iata,
                origin_city=dest_city,
                destination=origin_iata,
                destination_city=origin_city,
                departure=ret_dep.isoformat(),
                arrival=ret_arr.isoformat(),
                duration_minutes=ret_dur,
                stops=stops,
                carriers=[airline["name"]],
                carrier_logos=[],
            ))

        flights.append(FlightItinerary(
            id=f"flt-{uuid.uuid4().hex[:12]}",
            price=price,
            currency="USD",
            legs=legs,
            score=round(random.uniform(6.5, 9.8), 1),
            tags=[],
            deeplink=None,
        ))

    # Assign tags
    if flights:
        cheapest = min(flights, key=lambda f: f.price)
        cheapest.tags = ["Cheapest"]
        fastest = min(flights, key=lambda f: f.legs[0].duration_minutes)
        if fastest.id != cheapest.id:
            fastest.tags = ["Fastest"]
        best = max(flights, key=lambda f: f.score or 0)
        if best.id not in (cheapest.id, fastest.id):
            best.tags = ["Best"]

    result = sorted(flights, key=lambda f: f.price)
    _cache_flights(result)
    return result


# ── API response mappers ──────────────────────────────────────────────────────

def _map_api_airports(data: dict) -> List[Airport]:
    airports = []
    for place in data.get("data", []):
        try:
            airports.append(Airport(
                skyId=place.get("skyId", ""),
                entityId=place.get("entityId", ""),
                name=place.get("presentation", {}).get("title", ""),
                city=place.get("presentation", {}).get("suggestionTitle", ""),
                country=place.get("navigation", {}).get("localizedName", ""),
                iata=place.get("skyId", ""),
                type=place.get("navigation", {}).get("entityType", "AIRPORT"),
            ))
        except Exception:
            continue
    return airports


def _map_api_flights(data: dict, params: FlightSearchParams) -> List[FlightItinerary]:
    itineraries = []
    for raw in data.get("data", {}).get("itineraries", []):
        try:
            price = float(raw.get("price", {}).get("raw", 0))
            legs  = []
            for lr in raw.get("legs", []):
                carriers = [c.get("name", "") for c in lr.get("carriers", {}).get("marketing", [])]
                logos    = [c.get("logoUrl", "") for c in lr.get("carriers", {}).get("marketing", [])]
                segments = lr.get("segments", [])
                fn = segments[0].get("flightNumber", "") if segments else ""
                carrier_code = (lr.get("carriers", {}).get("marketing", [{}])[0].get("alternateId", ""))
                flight_number = f"{carrier_code} {fn}".strip() if fn else carrier_code

                origin_code = lr.get("origin", {}).get("displayCode", "")
                dest_code   = lr.get("destination", {}).get("displayCode", "")

                legs.append(Leg(
                    id=lr.get("id", str(uuid.uuid4())),
                    flight_number=flight_number,
                    origin=origin_code,
                    origin_city=lr.get("origin", {}).get("city", origin_code),
                    destination=dest_code,
                    destination_city=lr.get("destination", {}).get("city", dest_code),
                    departure=lr.get("departure", ""),
                    arrival=lr.get("arrival", ""),
                    duration_minutes=lr.get("durationInMinutes", 0),
                    stops=lr.get("stopCount", 0),
                    carriers=carriers,
                    carrier_logos=logos,
                ))

            tags  = [t.get("tag", "") for t in raw.get("tags", [])]
            score = raw.get("score")
            itineraries.append(FlightItinerary(
                id=raw.get("id", str(uuid.uuid4())),
                price=price,
                currency="USD",
                legs=legs,
                score=float(score) if score else None,
                tags=tags,
                deeplink=raw.get("deeplink"),
            ))
        except Exception as e:
            logger.warning(f"Failed to map itinerary: {e}")
    return itineraries


# ── Public service functions ──────────────────────────────────────────────────

async def search_airports(query: str) -> List[Airport]:
    if not _api_configured():
        return _generate_mock_airports(query)
    try:
        async with httpx.AsyncClient(timeout=10) as client:
            resp = await client.get(
                f"{_api_base()}/api/v1/flights/searchAirport",
                params={"query": query, "locale": "en-US"},
                headers=_rapidapi_headers(),
            )
            resp.raise_for_status()
            airports = _map_api_airports(resp.json())
            return airports or _generate_mock_airports(query)
    except Exception as e:
        logger.error(f"Airport search API error: {e}")
        return _generate_mock_airports(query)


async def search_flights(params: FlightSearchParams) -> List[FlightItinerary]:
    if not _api_configured():
        return _generate_mock_flights(params)
    try:
        qp: dict = {
            "originSkyId":      params.origin_sky_id,
            "originEntityId":   params.origin_entity_id,
            "destinationSkyId": params.destination_sky_id,
            "destinationEntityId": params.destination_entity_id,
            "date":       params.date,
            "adults":     params.adults,
            "children":   params.children,
            "infants":    params.infants,
            "cabinClass": params.cabin_class,
            "currency":   "USD",
            "countryCode":"US",
            "market":     "en-US",
            "sortBy":     "best",
            "limit":      20,
        }
        if params.return_date:
            qp["returnDate"] = params.return_date

        async with httpx.AsyncClient(timeout=20) as client:
            resp = await client.get(
                f"{_api_base()}/api/v1/flights/searchFlights",
                params=qp,
                headers=_rapidapi_headers(),
            )
            resp.raise_for_status()
            flights = _map_api_flights(resp.json(), params)
            if flights:
                _cache_flights(flights)
                return flights
            logger.warning("API returned no flights, falling back to mock")
            return _generate_mock_flights(params)
    except Exception as e:
        logger.error(f"Flight search API error: {e}")
        return _generate_mock_flights(params)


async def get_flight_details(flight_id: str) -> Optional[FlightItinerary]:
    """Return cached flight details by ID."""
    return get_cached_flight(flight_id)
