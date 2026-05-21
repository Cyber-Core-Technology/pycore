from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('storefront', '0002_cliente_y_pedidos'),
    ]

    operations = [
        # Remove Stripe fields
        migrations.RemoveField(model_name='pedidostorefront', name='stripe_payment_intent_id'),
        migrations.RemoveField(model_name='pedidostorefront', name='stripe_client_secret'),

        # Add Mercado Pago fields
        migrations.AddField(
            model_name='pedidostorefront',
            name='mp_preference_id',
            field=models.CharField(blank=True, max_length=120),
        ),
        migrations.AddField(
            model_name='pedidostorefront',
            name='mp_payment_id',
            field=models.CharField(blank=True, max_length=80),
        ),
        migrations.AddField(
            model_name='pedidostorefront',
            name='mp_checkout_url',
            field=models.CharField(blank=True, max_length=500),
        ),

        # Update metodo_pago choices (tarjeta → mercado_pago)
        migrations.AlterField(
            model_name='pedidostorefront',
            name='metodo_pago',
            field=models.CharField(
                choices=[
                    ('efectivo_en_tienda', 'Efectivo en tienda'),
                    ('mercado_pago', 'Mercado Pago'),
                ],
                max_length=30,
            ),
        ),
    ]
