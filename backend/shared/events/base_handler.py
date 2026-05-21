import logging
from abc import ABC, abstractmethod
from typing import Dict, Any

logger = logging.getLogger(__name__)


class BaseEventHandler(ABC):
    """
    Clase base que deben heredar todos los handlers de eventos.

    Garantiza:
    - Logging automático de entrada y salida
    - Manejo de errores que nunca rompe el bus
    - Estructura consistente en todos los módulos
    """

    @property
    def handler_name(self) -> str:
        return self.__class__.__name__

    def handle(self, payload: Dict[str, Any]) -> None:
        """
        Punto de entrada público. Envuelve process() con logging y error handling.
        NUNCA lanzar excepciones desde aquí — el bus no debe romperse.
        """
        logger.debug(f"[{self.handler_name}] Procesando evento con payload: {payload}")
        try:
            self.process(payload)
            logger.debug(f"[{self.handler_name}] ✅ Evento procesado correctamente")
        except Exception as e:
            logger.error(
                f"[{self.handler_name}] ❌ Error procesando evento: {str(e)}",
                exc_info=True
            )

    @abstractmethod
    def process(self, payload: Dict[str, Any]) -> None:
        """
        Lógica real del handler. Implementar en cada subclase.

        Args:
            payload: Datos del evento publicado
        """
        raise NotImplementedError
