"""Application constants."""

MAX_CHAT_INPUT_LENGTH = 500
MIN_CHAT_INPUT_LENGTH = 1

DEFAULT_SEARCH_RADIUS_MILES = 10
DEFAULT_DATE_EXTEND_DAYS = 3
MAX_SEARCH_RESULTS = 50

HTTP_TIMEOUT_SECONDS = 30
HTTP_CONNECT_TIMEOUT_SECONDS = 5

OPENAI_MODEL = "gpt-4o-mini"
OPENAI_TEMPERATURE = 0.3
OPENAI_MAX_TOKENS_PARSE = 200
OPENAI_MAX_TOKENS_RESPONSE = 300

CACHE_TTL_SECONDS = 60
SUPABASE_CACHE_TTL_MINUTES = 30
LOCATION_CACHE_TTL_HOURS = 24

SSE_MAX_CONNECTIONS = 100
RATE_LIMIT_PER_MINUTE = 100

INTENT_KEYWORDS = [
    "hidden gems",
    "underground",
    "secret spots",
    "locals only",
    "offbeat",
    "weird",
    "strange",
    "unique",
    "quirky",
    "dive bars",
    "hole in the wall",
    "authentic",
    "indie",
    "alternative",
]

SENSITIVE_KEYS = {"password", "api_key", "token", "secret", "credit_card", "apikey"}
