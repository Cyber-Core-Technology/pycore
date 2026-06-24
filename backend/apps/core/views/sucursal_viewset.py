from rest_framework import status
from rest_framework.viewsets import ViewSet
from rest_framework.response import Response

from apps.core.repositories import SucursalRepository, EmpresaRepository
from apps.core.serializers import SucursalSerializer, SucursalCreateSerializer
from apps.billing.services import StripeService, can_add_branch, can_remove_branch


class SucursalViewSet(ViewSet):

    def list(self, request):
        """GET /api/v1/core/sucursales/  — filtra por tenant del request"""
        empresa = request.tenant
        if not empresa:
            return Response({'error': 'Tenant requerido.'}, status=status.HTTP_400_BAD_REQUEST)
        sucursales = SucursalRepository.get_by_empresa(empresa)
        serializer = SucursalSerializer(sucursales, many=True)
        return Response(serializer.data)

    def create(self, request):
        """POST /api/v1/core/sucursales/"""
        empresa = request.tenant
        if not empresa:
            return Response({'error': 'Tenant requerido.'}, status=status.HTTP_400_BAD_REQUEST)
        permitido, motivo = can_add_branch(empresa)
        if not permitido:
            return Response({'detail': motivo}, status=status.HTTP_402_PAYMENT_REQUIRED)

        serializer = SucursalCreateSerializer(data=request.data)
        if not serializer.is_valid():
            return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

        # El código es único por empresa, incluso para sucursales dadas de baja
        # (borrado lógico). Si choca con una inactiva, la reactivamos; si choca
        # con una activa, devolvemos un error claro en lugar de un 500.
        codigo = serializer.validated_data.get('codigo')
        existente = SucursalRepository.get_by_codigo(empresa, codigo) if codigo else None
        if existente and existente.activo:
            return Response(
                {'codigo': ['Ya existe una sucursal activa con este código.']},
                status=status.HTTP_400_BAD_REQUEST,
            )
        if existente:
            sucursal = SucursalRepository.reactivate(existente, serializer.validated_data)
        else:
            sucursal = SucursalRepository.create(empresa, serializer.validated_data)

        # Sube el quantity en Stripe; cobra prorrateado los días restantes del ciclo.
        StripeService.sync_branch_quantity(empresa, proration_behavior='create_prorations')

        return Response(SucursalSerializer(sucursal).data, status=status.HTTP_201_CREATED)

    def retrieve(self, request, pk=None):
        """GET /api/v1/core/sucursales/{id}/"""
        sucursal = SucursalRepository.get_by_id(pk)
        if not sucursal:
            return Response({'error': 'Sucursal no encontrada.'}, status=status.HTTP_404_NOT_FOUND)
        return Response(SucursalSerializer(sucursal).data)

    def partial_update(self, request, pk=None):
        """PATCH /api/v1/core/sucursales/{id}/"""
        sucursal = SucursalRepository.get_by_id(pk)
        if not sucursal:
            return Response({'error': 'Sucursal no encontrada.'}, status=status.HTTP_404_NOT_FOUND)
        serializer = SucursalCreateSerializer(data=request.data, partial=True)
        if not serializer.is_valid():
            return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)
        sucursal = SucursalRepository.update_sucursal(sucursal, serializer.validated_data)
        return Response(SucursalSerializer(sucursal).data)

    def destroy(self, request, pk=None):
        """DELETE /api/v1/core/sucursales/{id}/"""
        sucursal = SucursalRepository.get_by_id(pk)
        if not sucursal:
            return Response({'error': 'Sucursal no encontrada.'}, status=status.HTTP_404_NOT_FOUND)
        if sucursal.es_principal:
            return Response(
                {'error': 'No se puede eliminar la sucursal principal.'},
                status=status.HTTP_400_BAD_REQUEST,
            )

        permitido, motivo = can_remove_branch(sucursal.empresa)
        if not permitido:
            return Response({'error': motivo}, status=status.HTTP_400_BAD_REQUEST)

        SucursalRepository.soft_delete_sucursal(sucursal)

        # Baja el quantity en Stripe; sin prorrateo: deja de contar el próximo ciclo.
        StripeService.sync_branch_quantity(sucursal.empresa, proration_behavior='none')

        return Response(status=status.HTTP_204_NO_CONTENT)
