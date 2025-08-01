import type { NextApiRequest, NextApiResponse } from 'next';
import satori from 'satori';
import sharp from 'sharp';

const CF_ACCOUNT_HASH = process.env.CF_ACCOUNT_HASH;
const BASE_URL = process.env.NEXT_PUBLIC_BASE_URL || 'https://yourdomain.com';
const FONT_FAMILY = 'Inter, system-ui,-apple-system,BlinkMacSystemFont';

// Simple in-memory cache (replace with Redis/CF KV for production)
const cache = new Map<string, Buffer>();

function buildCloudflareImageUrl(imageId: string, variant = 'public') {
  if (!CF_ACCOUNT_HASH || !imageId) return '';
  return `https://imagedelivery.net/${CF_ACCOUNT_HASH}/${imageId}/${variant}`;
}

function sanitizeText(t: string | string[] | undefined, max = 60) {
  if (!t) return '';
  let s = Array.isArray(t) ? t[0] : t;
  if (s.length > max) s = s.slice(0, max - 1) + '…';
  return s;
}

// Generate a cache key based on parameters
function mkKey(imageId: string, title: string, price: string) {
  return `${imageId}|${title}|${price}`;
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  try {
    const { imageId, title, price } = req.query;

    if (!imageId || Array.isArray(imageId)) {
      res.status(400).send('Missing imageId');
      return;
    }

    const safeTitle = sanitizeText(title);
    const safePrice = sanitizeText(price);
    const key = mkKey(imageId, safeTitle, safePrice);

    // Return cached if exists
    if (cache.has(key)) {
      const buf = cache.get(key)!;
      res.setHeader('Content-Type', 'image/webp');
      res.setHeader('Cache-Control', 'public, max-age=86400, stale-while-revalidate=3600');
      res.send(buf);
      return;
    }

    // Build background image URL; we won't embed it directly into SVG because of cross-origin.
    // Instead we fetch it and embed as <image> via base64.
    const bgUrl = buildCloudflareImageUrl(imageId as string, 'public');

    // Fetch the base image
    const fetchRes = await fetch(bgUrl);
    let bgData: string | null = null;
    if (fetchRes.ok) {
      const arrayBuffer = await fetchRes.arrayBuffer();
      const base64 = Buffer.from(arrayBuffer).toString('base64');
      // Assume PNG or JPEG; infer mime from first bytes is possible but we'll default to png/jpeg
      const contentType = fetchRes.headers.get('content-type') || 'image/jpeg';
      bgData = `data:${contentType};base64,${base64}`;
    }

    // SVG layout for social card (1200x630)
    const width = 1200;
    const height = 630;

    const svg = await satori(
      {
        type: 'div',
        props: {
          style: {
            width: `${width}px`,
            height: `${height}px`,
            position: 'relative',
            fontFamily: FONT_FAMILY,
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'flex-end',
            padding: '40px',
            boxSizing: 'border-box',
            color: '#ffffff',
          },
          children: [
            // background image
            bgData
              ? {
                  type: 'div',
                  props: {
                    style: {
                      position: 'absolute',
                      inset: 0,
                      backgroundImage: `url(${bgData})`,
                      backgroundSize: 'cover',
                      backgroundPosition: 'center',
                      filter: 'brightness(0.75)',
                      zIndex: 0,
                    },
                  },
                }
              : null,
            {
              type: 'div',
              props: {
                style: {
                  position: 'relative',
                  zIndex: 1,
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '12px',
                  flex: 1,
                  justifyContent: 'flex-end',
                },
                children: [
                  {
                    type: 'div',
                    props: {
                      style: {
                        fontSize: '64px',
                        fontWeight: 700,
                        lineHeight: 1.1,
                        margin: 0,
                        padding: 0,
                      },
                      children: safeTitle || SITE_NAME_PLACEHOLDER,
                    },
                  },
                  safePrice
                    ? {
                        type: 'div',
                        props: {
                          style: {
                            fontSize: '36px',
                            fontWeight: 500,
                            marginTop: '8px',
                          },
                          children: `$${safePrice}`,
                        },
                      }
                    : null,
                  {
                    type: 'div',
                    props: {
                      style: {
                        marginTop: '16px',
                        fontSize: '16px',
                        display: 'flex',
                        gap: '8px',
                        alignItems: 'center',
                      },
                      children: [
                        {
                          type: 'span',
                          props: {
                            style: {
                              backgroundColor: '#FFB300',
                              padding: '6px 12px',
                              borderRadius: '6px',
                              fontWeight: '600',
                              fontSize: '14px',
                              color: '#1F2937',
                              marginRight: '8px',
                            },
                            children: 'Custom Print Experts',
                          },
                        },
                        {
                          type: 'span',
                          props: {
                            style: { fontSize: '12px', opacity: 0.9 },
                            children: 'Fast Turnaround • High Quality',
                          },
                        },
                      ],
                    },
                  },
                ],
              },
            },
          ].filter(Boolean),
        },
      },
      {
        width,
        height,
        fonts: [
          // you can bundle Inter locally or rely on system fallback
          {
            name: 'Inter',
            data: Buffer.from(
              // placeholder: in production, load actual font file
              ''
            ),
            weight: 400,
            style: 'normal',
          },
        ],
      }
    );

    // Convert SVG to WebP via sharp
    const webpBuffer = await sharp(Buffer.from(svg)).webp({ quality: 85 }).toBuffer();

    // Cache it (simple in-memory, evict if too big in real usage)
    cache.set(key, webpBuffer);

    res.setHeader('Content-Type', 'image/webp');
    res.setHeader('Cache-Control', 'public, max-age=86400, stale-while-revalidate=3600');
    res.status(200).send(webpBuffer);
  } catch (err) {
    console.error('share-image generation error', err);
    res.status(500).send('Internal error generating share image');
  }
}
