"""Metrics collection for observability."""

import time
from collections import defaultdict
from dataclasses import asdict, dataclass
from typing import Any

from src.utils.logger import get_logger

logger = get_logger(__name__)


@dataclass
class Metric:
    """Performance metric."""

    name: str
    value: float
    unit: str
    tags: dict[str, str]
    timestamp: float


class MetricsCollector:
    """Collect and emit metrics for observability."""

    def __init__(self) -> None:
        self.metrics: list[Metric] = []
        self.counters: dict[str, int] = defaultdict(int)

    def timing(self, name: str, value: float, **tags: str) -> None:
        """Record timing metric in milliseconds.

        Args:
            name: Metric name
            value: Duration in milliseconds
            **tags: Additional tags for the metric
        """
        self.metrics.append(
            Metric(name=name, value=value, unit="ms", tags=tags, timestamp=time.time())
        )

    def counter(self, name: str, value: int = 1, **tags: str) -> None:
        """Increment counter metric.

        Args:
            name: Metric name
            value: Count to add (default 1)
            **tags: Additional tags for the metric
        """
        key = f"{name}:{','.join(f'{k}={v}' for k, v in tags.items())}"
        self.counters[key] += value

    def flush(self) -> None:
        """Emit all metrics and clear buffer."""
        for metric in self.metrics:
            logger.info(
                "metric.timing",
                metric_name=metric.name,
                value=metric.value,
                unit=metric.unit,
                **metric.tags,
            )

        for key, count in self.counters.items():
            name, tags_str = key.split(":", 1) if ":" in key else (key, "")
            tags = dict(tag.split("=") for tag in tags_str.split(",") if "=" in tag)
            logger.info("metric.counter", metric_name=name, count=count, **tags)

        self.metrics.clear()
        self.counters.clear()
