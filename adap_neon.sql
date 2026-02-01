--
-- PostgreSQL database dump
--

\restrict UdExqO3jN3N3Pqoe55zNycMFQ8g6a7CyXIgtXAyqzpu8KBc4AeVg58w70gGIM3y

-- Dumped from database version 17.7 (178558d)
-- Dumped by pg_dump version 17.7 (Debian 17.7-3.pgdg13+1)

SET statement_timeout = 0;
SET lock_timeout = 0;
SET idle_in_transaction_session_timeout = 0;
SET transaction_timeout = 0;
SET client_encoding = 'UTF8';
SET standard_conforming_strings = on;
SELECT pg_catalog.set_config('search_path', '', false);
SET check_function_bodies = false;
SET xmloption = content;
SET client_min_messages = warning;
SET row_security = off;

--
-- Name: neon_auth; Type: SCHEMA; Schema: -; Owner: -
--

CREATE SCHEMA neon_auth;


--
-- Name: currency_code; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public.currency_code AS ENUM (
    'USD',
    'CAD'
);


--
-- Name: loyalty_reason; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public.loyalty_reason AS ENUM (
    'purchase',
    'refund',
    'adjustment',
    'signup',
    'promotion'
);


--
-- Name: order_status; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public.order_status AS ENUM (
    'draft',
    'submitted',
    'paid',
    'fulfilled',
    'cancelled',
    'refunded'
);


SET default_tablespace = '';

SET default_table_access_method = heap;

--
-- Name: users_sync; Type: TABLE; Schema: neon_auth; Owner: -
--

CREATE TABLE neon_auth.users_sync (
    raw_json jsonb NOT NULL,
    id text GENERATED ALWAYS AS ((raw_json ->> 'id'::text)) STORED NOT NULL,
    name text GENERATED ALWAYS AS ((raw_json ->> 'display_name'::text)) STORED,
    email text GENERATED ALWAYS AS ((raw_json ->> 'primary_email'::text)) STORED,
    created_at timestamp with time zone GENERATED ALWAYS AS (to_timestamp((trunc((((raw_json ->> 'signed_up_at_millis'::text))::bigint)::double precision) / (1000)::double precision))) STORED,
    updated_at timestamp with time zone,
    deleted_at timestamp with time zone
);


--
-- Name: addresses; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.addresses (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    user_id text NOT NULL,
    name text,
    line1 text NOT NULL,
    line2 text,
    city text NOT NULL,
    state text NOT NULL,
    postal_code text NOT NULL,
    country text NOT NULL,
    phone text,
    is_default boolean DEFAULT false NOT NULL,
    created_at timestamp without time zone DEFAULT now(),
    updated_at timestamp without time zone DEFAULT now()
);


--
-- Name: artwork_uploads; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.artwork_uploads (
    id integer NOT NULL,
    product_id character varying(48) NOT NULL,
    order_id character varying(48),
    user_id character varying(64),
    file_url character varying(255) NOT NULL,
    file_name character varying(128) NOT NULL,
    file_size integer,
    file_type character varying(64),
    approved boolean DEFAULT false,
    created_at timestamp without time zone DEFAULT now()
);


--
-- Name: artwork_uploads_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.artwork_uploads_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: artwork_uploads_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.artwork_uploads_id_seq OWNED BY public.artwork_uploads.id;


--
-- Name: career_events; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.career_events (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    sid text,
    ip_hash text,
    user_agent text,
    referer text,
    event text NOT NULL,
    job_slug text,
    job_title text,
    location text,
    employment_type text,
    utm jsonb,
    created_at timestamp without time zone DEFAULT now() NOT NULL
);


--
-- Name: cart_artwork; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.cart_artwork (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    cart_line_id uuid NOT NULL,
    side integer NOT NULL,
    url text NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: cart_attachments; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.cart_attachments (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    cart_id uuid,
    line_id uuid,
    product_id integer NOT NULL,
    file_name text NOT NULL,
    key text NOT NULL,
    url text NOT NULL,
    thumb_key text,
    thumb_url text,
    cf_image_id text,
    created_at timestamp without time zone NOT NULL,
    updated_at timestamp without time zone NOT NULL
);


--
-- Name: cart_credits; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.cart_credits (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    cart_id uuid NOT NULL,
    source text DEFAULT 'loyalty'::text NOT NULL,
    amount_cents integer NOT NULL,
    created_at timestamp without time zone DEFAULT now() NOT NULL,
    updated_at timestamp without time zone DEFAULT now() NOT NULL
);


--
-- Name: cart_lines; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.cart_lines (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    cart_id uuid NOT NULL,
    product_id integer NOT NULL,
    quantity integer DEFAULT 1 NOT NULL,
    unit_price_cents integer DEFAULT 0 NOT NULL,
    line_total_cents integer,
    option_ids jsonb DEFAULT '[]'::jsonb NOT NULL,
    artwork jsonb,
    currency text DEFAULT 'USD'::text NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: carts; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.carts (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    sid text NOT NULL,
    status text DEFAULT 'open'::text NOT NULL,
    user_id text,
    currency text DEFAULT 'USD'::text NOT NULL,
    selected_shipping jsonb DEFAULT 'null'::jsonb,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: customer_addresses; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.customer_addresses (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    clerk_user_id text NOT NULL,
    customer_id uuid,
    label text,
    first_name text,
    last_name text,
    company text,
    phone text,
    street1 text NOT NULL,
    street2 text,
    city text NOT NULL,
    state text NOT NULL,
    postal_code text NOT NULL,
    country text NOT NULL,
    is_default boolean DEFAULT false NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: customers; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.customers (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    clerk_user_id text NOT NULL,
    display_name text,
    email text NOT NULL,
    phone_enc bytea,
    marketing_opt_in boolean DEFAULT false NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: guide_downloads; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.guide_downloads (
    id integer NOT NULL,
    href text NOT NULL,
    label text NOT NULL,
    category_path text NOT NULL,
    size_bytes integer DEFAULT 0 NOT NULL,
    ts bigint NOT NULL,
    referer text,
    ua text,
    ip text,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: guide_downloads_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.guide_downloads_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: guide_downloads_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.guide_downloads_id_seq OWNED BY public.guide_downloads.id;


--
-- Name: loyalty_transactions; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.loyalty_transactions (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    wallet_id uuid NOT NULL,
    customer_id text NOT NULL,
    order_id uuid,
    delta integer NOT NULL,
    reason public.loyalty_reason NOT NULL,
    note text,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: loyalty_wallets; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.loyalty_wallets (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    customer_id text NOT NULL,
    points_balance integer DEFAULT 0 NOT NULL,
    lifetime_earned integer DEFAULT 0 NOT NULL,
    lifetime_redeemed integer DEFAULT 0 NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: order_items; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.order_items (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    order_id uuid NOT NULL,
    product_id integer NOT NULL,
    name text,
    quantity integer DEFAULT 1 NOT NULL,
    unit_price_cents integer DEFAULT 0 NOT NULL,
    line_total_cents integer DEFAULT 0 NOT NULL,
    created_at timestamp without time zone DEFAULT now()
);


--
-- Name: order_sessions; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.order_sessions (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    user_id character varying(64),
    product_id character varying(64) NOT NULL,
    options jsonb DEFAULT '[]'::jsonb NOT NULL,
    files jsonb DEFAULT '[]'::jsonb NOT NULL,
    shipping_info jsonb,
    billing_info jsonb,
    tracking_url character varying(255),
    currency character varying(8) DEFAULT 'USD'::character varying NOT NULL,
    subtotal numeric DEFAULT '0'::numeric NOT NULL,
    tax numeric DEFAULT '0'::numeric NOT NULL,
    discount numeric DEFAULT '0'::numeric NOT NULL,
    total numeric DEFAULT '0'::numeric NOT NULL,
    selected_shipping_rate jsonb,
    stripe_checkout_session_id character varying(128),
    stripe_payment_intent_id character varying(128),
    sinalite_order_id character varying(64),
    notes character varying(1000),
    created_at timestamp without time zone DEFAULT now(),
    updated_at timestamp without time zone DEFAULT now()
);


--
-- Name: orders; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.orders (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    user_id text NOT NULL,
    status text DEFAULT 'draft'::text NOT NULL,
    created_at timestamp without time zone DEFAULT now(),
    updated_at timestamp without time zone DEFAULT now(),
    order_number text,
    currency character(3),
    subtotal_cents integer DEFAULT 0 NOT NULL,
    tax_cents integer DEFAULT 0 NOT NULL,
    shipping_cents integer DEFAULT 0 NOT NULL,
    discount_cents integer DEFAULT 0 NOT NULL,
    total_cents integer DEFAULT 0 NOT NULL,
    placed_at timestamp with time zone,
    provider text,
    provider_id text,
    customer_id text,
    billing_address_id uuid,
    shipping_address_id uuid,
    total numeric,
    cart_id uuid,
    payment_status text DEFAULT 'paid'::text,
    credits_cents integer DEFAULT 0
);


--
-- Name: price_tiers; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.price_tiers (
    id integer NOT NULL,
    scope text NOT NULL,
    scope_id integer,
    store text NOT NULL,
    min_qty integer NOT NULL,
    max_qty integer,
    mult numeric(6,3) NOT NULL,
    floor_pct numeric(5,3)
);


--
-- Name: price_tiers_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.price_tiers_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: price_tiers_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.price_tiers_id_seq OWNED BY public.price_tiers.id;


--
-- Name: product_reviews; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.product_reviews (
    id integer NOT NULL,
    product_id character varying(48) NOT NULL,
    name character varying(60) NOT NULL,
    email character varying(80),
    rating integer NOT NULL,
    comment text NOT NULL,
    approved boolean DEFAULT false,
    user_ip character varying(45),
    terms_agreed boolean DEFAULT false,
    created_at timestamp without time zone DEFAULT now(),
    verified boolean DEFAULT false
);


--
-- Name: product_reviews_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.product_reviews_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: product_reviews_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.product_reviews_id_seq OWNED BY public.product_reviews.id;


--
-- Name: review_helpful_votes; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.review_helpful_votes (
    id integer NOT NULL,
    review_id integer NOT NULL,
    user_id character varying(64),
    ip character varying(48),
    voter_fingerprint character varying(64) NOT NULL,
    is_helpful boolean DEFAULT true NOT NULL,
    created_at timestamp without time zone DEFAULT now()
);


--
-- Name: review_helpful_votes_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.review_helpful_votes_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: review_helpful_votes_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.review_helpful_votes_id_seq OWNED BY public.review_helpful_votes.id;


--
-- Name: artwork_uploads id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.artwork_uploads ALTER COLUMN id SET DEFAULT nextval('public.artwork_uploads_id_seq'::regclass);


--
-- Name: guide_downloads id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.guide_downloads ALTER COLUMN id SET DEFAULT nextval('public.guide_downloads_id_seq'::regclass);


--
-- Name: price_tiers id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.price_tiers ALTER COLUMN id SET DEFAULT nextval('public.price_tiers_id_seq'::regclass);


--
-- Name: product_reviews id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.product_reviews ALTER COLUMN id SET DEFAULT nextval('public.product_reviews_id_seq'::regclass);


--
-- Name: review_helpful_votes id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.review_helpful_votes ALTER COLUMN id SET DEFAULT nextval('public.review_helpful_votes_id_seq'::regclass);


--
-- Data for Name: users_sync; Type: TABLE DATA; Schema: neon_auth; Owner: -
--

COPY neon_auth.users_sync (raw_json, updated_at, deleted_at) FROM stdin;
\.


--
-- Data for Name: addresses; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.addresses (id, user_id, name, line1, line2, city, state, postal_code, country, phone, is_default, created_at, updated_at) FROM stdin;
\.


--
-- Data for Name: artwork_uploads; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.artwork_uploads (id, product_id, order_id, user_id, file_url, file_name, file_size, file_type, approved, created_at) FROM stdin;
\.


--
-- Data for Name: career_events; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.career_events (id, sid, ip_hash, user_agent, referer, event, job_slug, job_title, location, employment_type, utm, created_at) FROM stdin;
\.


--
-- Data for Name: cart_artwork; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.cart_artwork (id, cart_line_id, side, url, created_at) FROM stdin;
\.


--
-- Data for Name: cart_attachments; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.cart_attachments (id, cart_id, line_id, product_id, file_name, key, url, thumb_key, thumb_url, cf_image_id, created_at, updated_at) FROM stdin;
c633e13c-1644-4d2a-a903-0ecfe95bf0d4	1d1ca933-d1c4-45e5-bbbf-57aa8fd91107	bed8e550-f7a1-4e75-9150-cb401758c1ce	10	Screenshot from 2025-10-24 17-12-46.png	artwork/79230126-05cc-4f88-be5a-749bedfe67b0.png	https://uploads.adapnow.com/artwork/79230126-05cc-4f88-be5a-749bedfe67b0.png	thumbs/a6b26a98-498d-43cc-b5de-aa30fa60408e.jpg	https://uploads.adapnow.com/thumbs/a6b26a98-498d-43cc-b5de-aa30fa60408e.jpg	\N	2025-10-26 00:51:34.946	2025-10-26 00:51:34.946
2eba0d8b-7903-4ce1-9fae-91993490841d	1d1ca933-d1c4-45e5-bbbf-57aa8fd91107	bed8e550-f7a1-4e75-9150-cb401758c1ce	10	Screenshot from 2025-10-25 20-10-28.png	artwork/b2f6c826-cf15-46b5-acac-72dc97a6812e.png	https://uploads.adapnow.com/artwork/b2f6c826-cf15-46b5-acac-72dc97a6812e.png	\N	\N	\N	2025-10-26 00:51:34.946	2025-10-26 00:51:34.946
\.


--
-- Data for Name: cart_credits; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.cart_credits (id, cart_id, source, amount_cents, created_at, updated_at) FROM stdin;
\.


--
-- Data for Name: cart_lines; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.cart_lines (id, cart_id, product_id, quantity, unit_price_cents, line_total_cents, option_ids, artwork, currency, created_at, updated_at) FROM stdin;
bed8e550-f7a1-4e75-9150-cb401758c1ce	1d1ca933-d1c4-45e5-bbbf-57aa8fd91107	10	26	153	3825	[105, 18, 550, 4, 546, 540]	{}	USD	2025-10-26 00:51:22.91594+00	2025-10-26 00:51:23.130249+00
\.


--
-- Data for Name: carts; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.carts (id, sid, status, user_id, currency, selected_shipping, created_at, updated_at) FROM stdin;
1d1ca933-d1c4-45e5-bbbf-57aa8fd91107	845c33b7-8a7f-482e-baca-e01ffc4430dd	open	\N	USD	null	2025-10-26 00:08:51.397236+00	2025-10-26 00:08:51.397236+00
73a50f6c-7438-4b06-88be-68ebc03148fb	80698685-2cfc-4549-84b2-8a45182b62a3	open	\N	USD	null	2025-11-20 01:40:42.671144+00	2025-11-20 01:40:42.671144+00
afaf85a4-ec42-4484-8989-68d3a7e8067d	ac3f4f3f-f738-47c5-8068-0863541b305c	open	\N	USD	null	2025-12-03 02:36:44.722133+00	2025-12-03 02:36:44.722133+00
\.


--
-- Data for Name: customer_addresses; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.customer_addresses (id, clerk_user_id, customer_id, label, first_name, last_name, company, phone, street1, street2, city, state, postal_code, country, is_default, created_at, updated_at) FROM stdin;
\.


--
-- Data for Name: customers; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.customers (id, clerk_user_id, display_name, email, phone_enc, marketing_opt_in, created_at, updated_at) FROM stdin;
\.


--
-- Data for Name: guide_downloads; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.guide_downloads (id, href, label, category_path, size_bytes, ts, referer, ua, ip, created_at) FROM stdin;
\.


--
-- Data for Name: loyalty_transactions; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.loyalty_transactions (id, wallet_id, customer_id, order_id, delta, reason, note, created_at) FROM stdin;
\.


--
-- Data for Name: loyalty_wallets; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.loyalty_wallets (id, customer_id, points_balance, lifetime_earned, lifetime_redeemed, created_at, updated_at) FROM stdin;
\.


--
-- Data for Name: order_items; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.order_items (id, order_id, product_id, name, quantity, unit_price_cents, line_total_cents, created_at) FROM stdin;
\.


--
-- Data for Name: order_sessions; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.order_sessions (id, user_id, product_id, options, files, shipping_info, billing_info, tracking_url, currency, subtotal, tax, discount, total, selected_shipping_rate, stripe_checkout_session_id, stripe_payment_intent_id, sinalite_order_id, notes, created_at, updated_at) FROM stdin;
\.


--
-- Data for Name: orders; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.orders (id, user_id, status, created_at, updated_at, order_number, currency, subtotal_cents, tax_cents, shipping_cents, discount_cents, total_cents, placed_at, provider, provider_id, customer_id, billing_address_id, shipping_address_id, total, cart_id, payment_status, credits_cents) FROM stdin;
\.


--
-- Data for Name: price_tiers; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.price_tiers (id, scope, scope_id, store, min_qty, max_qty, mult, floor_pct) FROM stdin;
\.


--
-- Data for Name: product_reviews; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.product_reviews (id, product_id, name, email, rating, comment, approved, user_ip, terms_agreed, created_at, verified) FROM stdin;
\.


--
-- Data for Name: review_helpful_votes; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.review_helpful_votes (id, review_id, user_id, ip, voter_fingerprint, is_helpful, created_at) FROM stdin;
\.


--
-- Name: artwork_uploads_id_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public.artwork_uploads_id_seq', 1, false);


--
-- Name: guide_downloads_id_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public.guide_downloads_id_seq', 1, false);


--
-- Name: price_tiers_id_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public.price_tiers_id_seq', 1, false);


--
-- Name: product_reviews_id_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public.product_reviews_id_seq', 1, false);


--
-- Name: review_helpful_votes_id_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public.review_helpful_votes_id_seq', 1, false);


--
-- Name: users_sync users_sync_pkey; Type: CONSTRAINT; Schema: neon_auth; Owner: -
--

ALTER TABLE ONLY neon_auth.users_sync
    ADD CONSTRAINT users_sync_pkey PRIMARY KEY (id);


--
-- Name: addresses addresses_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.addresses
    ADD CONSTRAINT addresses_pkey PRIMARY KEY (id);


--
-- Name: artwork_uploads artwork_uploads_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.artwork_uploads
    ADD CONSTRAINT artwork_uploads_pkey PRIMARY KEY (id);


--
-- Name: career_events career_events_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.career_events
    ADD CONSTRAINT career_events_pkey PRIMARY KEY (id);


--
-- Name: cart_artwork cart_artwork_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.cart_artwork
    ADD CONSTRAINT cart_artwork_pkey PRIMARY KEY (id);


--
-- Name: cart_attachments cart_attachments_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.cart_attachments
    ADD CONSTRAINT cart_attachments_pkey PRIMARY KEY (id);


--
-- Name: cart_credits cart_credits_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.cart_credits
    ADD CONSTRAINT cart_credits_pkey PRIMARY KEY (id);


--
-- Name: cart_lines cart_lines_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.cart_lines
    ADD CONSTRAINT cart_lines_pkey PRIMARY KEY (id);


--
-- Name: carts carts_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.carts
    ADD CONSTRAINT carts_pkey PRIMARY KEY (id);


--
-- Name: customer_addresses customer_addresses_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.customer_addresses
    ADD CONSTRAINT customer_addresses_pkey PRIMARY KEY (id);


--
-- Name: customers customers_clerk_user_id_unique; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.customers
    ADD CONSTRAINT customers_clerk_user_id_unique UNIQUE (clerk_user_id);


--
-- Name: customers customers_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.customers
    ADD CONSTRAINT customers_pkey PRIMARY KEY (id);


--
-- Name: guide_downloads guide_downloads_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.guide_downloads
    ADD CONSTRAINT guide_downloads_pkey PRIMARY KEY (id);


--
-- Name: loyalty_transactions loyalty_transactions_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.loyalty_transactions
    ADD CONSTRAINT loyalty_transactions_pkey PRIMARY KEY (id);


--
-- Name: loyalty_wallets loyalty_wallets_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.loyalty_wallets
    ADD CONSTRAINT loyalty_wallets_pkey PRIMARY KEY (id);


--
-- Name: order_items order_items_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.order_items
    ADD CONSTRAINT order_items_pkey PRIMARY KEY (id);


--
-- Name: order_sessions order_sessions_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.order_sessions
    ADD CONSTRAINT order_sessions_pkey PRIMARY KEY (id);


--
-- Name: orders orders_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.orders
    ADD CONSTRAINT orders_pkey PRIMARY KEY (id);


--
-- Name: price_tiers price_tiers_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.price_tiers
    ADD CONSTRAINT price_tiers_pkey PRIMARY KEY (id);


--
-- Name: product_reviews product_reviews_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.product_reviews
    ADD CONSTRAINT product_reviews_pkey PRIMARY KEY (id);


--
-- Name: review_helpful_votes review_helpful_votes_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.review_helpful_votes
    ADD CONSTRAINT review_helpful_votes_pkey PRIMARY KEY (id);


--
-- Name: users_sync_deleted_at_idx; Type: INDEX; Schema: neon_auth; Owner: -
--

CREATE INDEX users_sync_deleted_at_idx ON neon_auth.users_sync USING btree (deleted_at);


--
-- Name: addresses_user_default_uq; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX addresses_user_default_uq ON public.addresses USING btree (user_id) WHERE (is_default = true);


--
-- Name: addresses_user_id_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX addresses_user_id_idx ON public.addresses USING btree (user_id);


--
-- Name: cart_attachments_cart_id_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX cart_attachments_cart_id_idx ON public.cart_attachments USING btree (cart_id);


--
-- Name: cart_attachments_line_id_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX cart_attachments_line_id_idx ON public.cart_attachments USING btree (line_id);


--
-- Name: cart_attachments_line_key_uq; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX cart_attachments_line_key_uq ON public.cart_attachments USING btree (line_id, key);


--
-- Name: gd_created_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX gd_created_idx ON public.guide_downloads USING btree (created_at);


--
-- Name: gd_href_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX gd_href_idx ON public.guide_downloads USING btree (href);


--
-- Name: gd_ts_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX gd_ts_idx ON public.guide_downloads USING btree (ts);


--
-- Name: idx_addr_clerk; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_addr_clerk ON public.customer_addresses USING btree (clerk_user_id);


--
-- Name: idx_addr_customer; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_addr_customer ON public.customer_addresses USING btree (customer_id);


--
-- Name: idx_career_events_created_at; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_career_events_created_at ON public.career_events USING btree (created_at);


--
-- Name: idx_career_events_event; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_career_events_event ON public.career_events USING btree (event);


--
-- Name: idx_career_events_job_slug; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_career_events_job_slug ON public.career_events USING btree (job_slug);


--
-- Name: idx_career_events_sid; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_career_events_sid ON public.career_events USING btree (sid);


--
-- Name: idx_cart_credits_cart; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_cart_credits_cart ON public.cart_credits USING btree (cart_id);


--
-- Name: idx_carts_sid; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_carts_sid ON public.carts USING btree (sid);


--
-- Name: idx_carts_status; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_carts_status ON public.carts USING btree (status);


--
-- Name: idx_carts_user; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_carts_user ON public.carts USING btree (user_id);


--
-- Name: idx_customers_clerk; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_customers_clerk ON public.customers USING btree (clerk_user_id);


--
-- Name: idx_customers_email; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_customers_email ON public.customers USING btree (email);


--
-- Name: idx_txn_customer; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_txn_customer ON public.loyalty_transactions USING btree (customer_id);


--
-- Name: idx_txn_order; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_txn_order ON public.loyalty_transactions USING btree (order_id);


--
-- Name: idx_txn_wallet; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_txn_wallet ON public.loyalty_transactions USING btree (wallet_id);


--
-- Name: idx_wallets_customer; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_wallets_customer ON public.loyalty_wallets USING btree (customer_id);


--
-- Name: order_items_order_id_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX order_items_order_id_idx ON public.order_items USING btree (order_id);


--
-- Name: order_items_order_id_product_id_uq; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX order_items_order_id_product_id_uq ON public.order_items USING btree (order_id, product_id);


--
-- Name: order_items_product_id_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX order_items_product_id_idx ON public.order_items USING btree (product_id);


--
-- Name: orders_customer_id_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX orders_customer_id_idx ON public.orders USING btree (customer_id);


--
-- Name: orders_provider_provider_id_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX orders_provider_provider_id_idx ON public.orders USING btree (provider, provider_id);


--
-- Name: review_helpful_review_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX review_helpful_review_idx ON public.review_helpful_votes USING btree (review_id);


--
-- Name: review_helpful_user_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX review_helpful_user_idx ON public.review_helpful_votes USING btree (user_id);


--
-- Name: reviews_approved_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX reviews_approved_idx ON public.product_reviews USING btree (approved);


--
-- Name: reviews_created_at_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX reviews_created_at_idx ON public.product_reviews USING btree (created_at);


--
-- Name: reviews_product_id_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX reviews_product_id_idx ON public.product_reviews USING btree (product_id);


--
-- Name: reviews_rating_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX reviews_rating_idx ON public.product_reviews USING btree (rating);


--
-- Name: uniq_addr_default_by_clerk; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX uniq_addr_default_by_clerk ON public.customer_addresses USING btree (clerk_user_id) WHERE (is_default = true);


--
-- Name: uniq_loyalty_wallet_by_customer; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX uniq_loyalty_wallet_by_customer ON public.loyalty_wallets USING btree (customer_id);


--
-- Name: uniq_review_helpful_by_fp; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX uniq_review_helpful_by_fp ON public.review_helpful_votes USING btree (review_id, voter_fingerprint);


--
-- Name: cart_artwork cart_artwork_cart_line_id_cart_lines_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.cart_artwork
    ADD CONSTRAINT cart_artwork_cart_line_id_cart_lines_id_fk FOREIGN KEY (cart_line_id) REFERENCES public.cart_lines(id) ON DELETE CASCADE;


--
-- Name: cart_attachments cart_attachments_cart_id_carts_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.cart_attachments
    ADD CONSTRAINT cart_attachments_cart_id_carts_id_fk FOREIGN KEY (cart_id) REFERENCES public.carts(id) ON DELETE CASCADE;


--
-- Name: cart_attachments cart_attachments_line_id_cart_lines_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.cart_attachments
    ADD CONSTRAINT cart_attachments_line_id_cart_lines_id_fk FOREIGN KEY (line_id) REFERENCES public.cart_lines(id) ON DELETE CASCADE;


--
-- Name: cart_credits cart_credits_cart_id_carts_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.cart_credits
    ADD CONSTRAINT cart_credits_cart_id_carts_id_fk FOREIGN KEY (cart_id) REFERENCES public.carts(id) ON DELETE CASCADE;


--
-- Name: cart_lines cart_lines_cart_id_carts_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.cart_lines
    ADD CONSTRAINT cart_lines_cart_id_carts_id_fk FOREIGN KEY (cart_id) REFERENCES public.carts(id) ON DELETE CASCADE;


--
-- Name: cart_lines cart_lines_cart_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.cart_lines
    ADD CONSTRAINT cart_lines_cart_id_fkey FOREIGN KEY (cart_id) REFERENCES public.carts(id) ON DELETE CASCADE;


--
-- Name: customer_addresses customer_addresses_customer_id_customers_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.customer_addresses
    ADD CONSTRAINT customer_addresses_customer_id_customers_id_fk FOREIGN KEY (customer_id) REFERENCES public.customers(id) ON DELETE CASCADE;


--
-- Name: loyalty_transactions loyalty_transactions_order_id_orders_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.loyalty_transactions
    ADD CONSTRAINT loyalty_transactions_order_id_orders_id_fk FOREIGN KEY (order_id) REFERENCES public.orders(id) ON DELETE SET NULL;


--
-- Name: loyalty_transactions loyalty_transactions_wallet_id_loyalty_wallets_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.loyalty_transactions
    ADD CONSTRAINT loyalty_transactions_wallet_id_loyalty_wallets_id_fk FOREIGN KEY (wallet_id) REFERENCES public.loyalty_wallets(id) ON DELETE CASCADE;


--
-- Name: review_helpful_votes review_helpful_votes_review_id_product_reviews_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.review_helpful_votes
    ADD CONSTRAINT review_helpful_votes_review_id_product_reviews_id_fk FOREIGN KEY (review_id) REFERENCES public.product_reviews(id) ON DELETE CASCADE;


--
-- PostgreSQL database dump complete
--

\unrestrict UdExqO3jN3N3Pqoe55zNycMFQ8g6a7CyXIgtXAyqzpu8KBc4AeVg58w70gGIM3y

