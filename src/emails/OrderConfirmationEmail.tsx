import {
  Html,
  Head,
  Preview,
  Body,
  Container,
  Section,
  Text,
  Button,
  Hr,
} from "@react-email/components";

interface OrderConfirmationEmailProps {
  name: string;
  orderId: string | number;
  orderTotal: string;
  trackingUrl?: string;
}

export default function OrderConfirmationEmail({
  name,
  orderId,
  orderTotal,
  trackingUrl,
}: OrderConfirmationEmailProps) {
  return (
    <Html>
      <Head />
      <Preview>Thank you for your order! #{orderId}</Preview>
      <Body style={{ background: "#f9fafb", color: "#181818", fontFamily: "sans-serif" }}>
        <Container style={{ maxWidth: 600, margin: "24px auto", background: "#fff", borderRadius: 8, padding: 24 }}>
          <Section>
            <Text style={{ fontSize: 24, fontWeight: 700, marginBottom: 10 }}>Thank you for your order, {name}!</Text>
            <Text style={{ fontSize: 18, marginBottom: 12 }}>
              Your order <b>#{orderId}</b> has been received.
            </Text>
            <Text style={{ fontSize: 16, marginBottom: 10 }}>
              <b>Total:</b> {orderTotal}
            </Text>
            {trackingUrl && (
              <Button
                href={trackingUrl}
                style={{
                  background: "#0047ab",
                  color: "#fff",
                  padding: "12px 28px",
                  borderRadius: 6,
                  textDecoration: "none",
                  fontWeight: 600,
                  fontSize: 16,
                  margin: "16px 0",
                  display: "inline-block",
                }}
              >
                Track Your Order
              </Button>
            )}
            <Hr />
            <Text style={{ fontSize: 14, color: "#5f6368" }}>
              If you have any questions, reply to this email or call us at 555-555-5555.
            </Text>
          </Section>
        </Container>
      </Body>
    </Html>
  );
}
