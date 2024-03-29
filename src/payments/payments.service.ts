/* eslint-disable @typescript-eslint/no-unused-vars */
import { Injectable } from '@nestjs/common';
import { envs } from 'src/config';
import Stripe from 'stripe';
import { PaymentSessionDto } from './dto/payment-session.dto';
import { Request, Response } from 'express';

@Injectable()
export class PaymentsService {
  private readonly stripe = new Stripe(envs.stripeSecret);

  async createPaymentSession(paymentSessionDto: PaymentSessionDto) {
    const { currency, items, orderId } = paymentSessionDto;
    const lineItems = items.map((item) => {
      return {
        price_data: {
          currency: currency,
          product_data: { name: item.name },
          unit_amount: Math.round(item.price * 100),
        },
        quantity: item.quantity,
      };
    });

    const session = await this.stripe.checkout.sessions.create({
      payment_intent_data: {
        metadata: {
          integration_check: 'accept_a_payment',
          orderId: orderId,
        },
      },
      line_items: lineItems,
      mode: 'payment',
      success_url: `${envs.baseUrl}/payments/success`,
      cancel_url: `${envs.baseUrl}/payments/cancelled`,
    });
    return session;
  }

  async stripeWebhook(req: Request, res: Response) {
    const sig = req.headers['stripe-signature'];
    const endpointSecret = envs.stripeEndpointSecret;

    let event: Stripe.Event;

    try {
      event = this.stripe.webhooks.constructEvent(
        req['rawBody'],
        sig,
        endpointSecret,
      );
      console.log('Event:', event);
    } catch (err) {
      res.status(400).send(`Webhook Error: ${err.message}`);
      return;
    }
  }
}
