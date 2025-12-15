--
-- PostgreSQL database dump
--

-- Dumped from database version 17.5
-- Dumped by pg_dump version 17.5

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
-- Name: update_updated_at_column(); Type: FUNCTION; Schema: public; Owner: postgres
--

CREATE FUNCTION public.update_updated_at_column() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
    BEGIN
        NEW.updated_at = CURRENT_TIMESTAMP;
        RETURN NEW;
    END;
    $$;


ALTER FUNCTION public.update_updated_at_column() OWNER TO postgres;

SET default_tablespace = '';

SET default_table_access_method = heap;

--
-- Name: add_charges; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.add_charges (
    id integer NOT NULL,
    charge_name character varying(100) NOT NULL,
    value numeric(10,2) DEFAULT 0.00,
    other text,
    created_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
    updated_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT add_charges_value_check CHECK ((value >= (0)::numeric))
);


ALTER TABLE public.add_charges OWNER TO postgres;

--
-- Name: add_charges_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.add_charges_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.add_charges_id_seq OWNER TO postgres;

--
-- Name: add_charges_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.add_charges_id_seq OWNED BY public.add_charges.id;


--
-- Name: additional_services; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.additional_services (
    id integer NOT NULL,
    session_id integer NOT NULL,
    service_type character varying(50) NOT NULL,
    count integer DEFAULT 1 NOT NULL,
    charge numeric(10,2) DEFAULT 0.00 NOT NULL,
    created_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
    updated_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT additional_services_charge_check CHECK ((charge >= (0)::numeric)),
    CONSTRAINT additional_services_count_check CHECK ((count > 0)),
    CONSTRAINT additional_services_service_type_check CHECK (((service_type)::text = ANY ((ARRAY['bottle_keep'::character varying, 'vip_room'::character varying, 'karaoke'::character varying])::text[])))
);


ALTER TABLE public.additional_services OWNER TO postgres;

--
-- Name: additional_services_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.additional_services_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.additional_services_id_seq OWNER TO postgres;

--
-- Name: additional_services_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.additional_services_id_seq OWNED BY public.additional_services.id;


--
-- Name: attendance; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.attendance (
    id integer NOT NULL,
    staff_id integer NOT NULL,
    clock_in timestamp with time zone NOT NULL,
    clock_out timestamp with time zone,
    total_work_hours numeric(5,2),
    comment text,
    detailed_times jsonb,
    status character varying(20) DEFAULT 'pending'::character varying,
    approved_by integer,
    approved_at timestamp with time zone,
    created_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
    updated_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT attendance_status_check CHECK (((status)::text = ANY ((ARRAY['pending'::character varying, 'approved'::character varying, 'rejected'::character varying, 'saved'::character varying])::text[])))
);


ALTER TABLE public.attendance OWNER TO postgres;

--
-- Name: attendance_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.attendance_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.attendance_id_seq OWNER TO postgres;

--
-- Name: attendance_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.attendance_id_seq OWNED BY public.attendance.id;


--
-- Name: bottle_keep; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.bottle_keep (
    id integer NOT NULL,
    client_name character varying(255) NOT NULL,
    client_email character varying(255),
    bottle_name character varying(255) NOT NULL,
    amount integer NOT NULL,
    session_id integer NOT NULL,
    table_id integer NOT NULL,
    other text,
    created_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
    updated_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT bottle_keep_amount_check CHECK ((amount >= 0))
);


ALTER TABLE public.bottle_keep OWNER TO postgres;

--
-- Name: bottle_keep_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.bottle_keep_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.bottle_keep_id_seq OWNER TO postgres;

--
-- Name: bottle_keep_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.bottle_keep_id_seq OWNED BY public.bottle_keep.id;


--
-- Name: callmanager; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.callmanager (
    id integer NOT NULL,
    cast_id integer,
    table_id integer NOT NULL,
    session_id integer NOT NULL,
    calltype character varying(50) DEFAULT 'manager'::character varying NOT NULL,
    status character varying(20) DEFAULT 'pending'::character varying,
    accepted_at timestamp with time zone,
    accepted_by integer,
    created_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
    updated_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT callmanager_status_check CHECK (((status)::text = ANY ((ARRAY['pending'::character varying, 'accepted'::character varying, 'rejected'::character varying])::text[])))
);


ALTER TABLE public.callmanager OWNER TO postgres;

--
-- Name: callmanager_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.callmanager_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.callmanager_id_seq OWNER TO postgres;

--
-- Name: callmanager_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.callmanager_id_seq OWNED BY public.callmanager.id;


--
-- Name: category; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.category (
    id integer NOT NULL,
    name character varying(100) NOT NULL,
    other text,
    created_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
    updated_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP
);


ALTER TABLE public.category OWNER TO postgres;

--
-- Name: category_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.category_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.category_id_seq OWNER TO postgres;

--
-- Name: category_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.category_id_seq OWNED BY public.category.id;


--
-- Name: nomination; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.nomination (
    id integer NOT NULL,
    cast_id integer NOT NULL,
    table_id integer NOT NULL,
    session_id integer NOT NULL,
    type_id character varying(50) NOT NULL,
    created_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
    updated_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
    cost numeric(10,2) DEFAULT 0.00,
    CONSTRAINT nomination_cost_check CHECK ((cost >= (0)::numeric)),
    CONSTRAINT nomination_type_id_check CHECK (((type_id)::text = ANY ((ARRAY['main'::character varying, 'inside'::character varying, 'together'::character varying])::text[])))
);


ALTER TABLE public.nomination OWNER TO postgres;

--
-- Name: nomination_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.nomination_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.nomination_id_seq OWNER TO postgres;

--
-- Name: nomination_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.nomination_id_seq OWNED BY public.nomination.id;


--
-- Name: product; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.product (
    id integer NOT NULL,
    category_id integer NOT NULL,
    name character varying(200) NOT NULL,
    sku character varying(50) NOT NULL,
    sale_price numeric(10,2) NOT NULL,
    amount integer DEFAULT 0,
    other text,
    created_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
    updated_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT product_amount_check CHECK ((amount >= 0)),
    CONSTRAINT product_sale_price_check CHECK ((sale_price >= (0)::numeric))
);


ALTER TABLE public.product OWNER TO postgres;

--
-- Name: product_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.product_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.product_id_seq OWNER TO postgres;

--
-- Name: product_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.product_id_seq OWNED BY public.product.id;


--
-- Name: project_variable; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.project_variable (
    id integer NOT NULL,
    name character varying(100) NOT NULL,
    value text,
    other text,
    created_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
    updated_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP
);


ALTER TABLE public.project_variable OWNER TO postgres;

--
-- Name: project_variable_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.project_variable_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.project_variable_id_seq OWNER TO postgres;

--
-- Name: project_variable_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.project_variable_id_seq OWNED BY public.project_variable.id;


--
-- Name: salary; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.salary (
    id integer NOT NULL,
    user_id integer NOT NULL,
    year integer NOT NULL,
    month integer NOT NULL,
    basic_hours numeric(7,2) DEFAULT 0.00,
    base_pay numeric(12,2) DEFAULT 0.00,
    main_nomination_count integer DEFAULT 0,
    main_nomination_fee numeric(12,2) DEFAULT 0.00,
    inside_nomination_count integer DEFAULT 0,
    inside_nomination_fee numeric(12,2) DEFAULT 0.00,
    drink_back_yen numeric(12,2) DEFAULT 0.00,
    overtime_wage_yen numeric(12,2) DEFAULT 0.00,
    deduction_yen numeric(12,2) DEFAULT 0.00,
    total_pay_yen numeric(12,2) DEFAULT 0.00,
    created_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
    updated_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
    food_back_yen numeric(12,2) DEFAULT 0.00,
    together_nomination_count integer DEFAULT 0,
    together_nomination_fee numeric(12,2) DEFAULT 0.00,
    together_nomination_cost numeric(12,2) DEFAULT 0.00,
    CONSTRAINT salary_base_pay_check CHECK ((base_pay >= (0)::numeric)),
    CONSTRAINT salary_basic_hours_check CHECK ((basic_hours >= (0)::numeric)),
    CONSTRAINT salary_drink_back_yen_check CHECK ((drink_back_yen >= (0)::numeric)),
    CONSTRAINT salary_food_back_yen_check CHECK ((food_back_yen >= (0)::numeric)),
    CONSTRAINT salary_inside_nomination_count_check CHECK ((inside_nomination_count >= 0)),
    CONSTRAINT salary_inside_nomination_fee_check CHECK ((inside_nomination_fee >= (0)::numeric)),
    CONSTRAINT salary_main_nomination_count_check CHECK ((main_nomination_count >= 0)),
    CONSTRAINT salary_main_nomination_fee_check CHECK ((main_nomination_fee >= (0)::numeric)),
    CONSTRAINT salary_month_check CHECK (((month >= 1) AND (month <= 12))),
    CONSTRAINT salary_overtime_wage_yen_check CHECK ((overtime_wage_yen >= (0)::numeric)),
    CONSTRAINT salary_together_nomination_cost_check CHECK ((together_nomination_cost >= (0)::numeric)),
    CONSTRAINT salary_together_nomination_count_check CHECK ((together_nomination_count >= 0)),
    CONSTRAINT salary_together_nomination_fee_check CHECK ((together_nomination_fee >= (0)::numeric))
);


ALTER TABLE public.salary OWNER TO postgres;

--
-- Name: COLUMN salary.together_nomination_cost; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON COLUMN public.salary.together_nomination_cost IS '同伴者の金額（編集可能）';


--
-- Name: salary_attenday; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.salary_attenday (
    id integer NOT NULL,
    category_id integer NOT NULL,
    attenday_number integer NOT NULL,
    value numeric(10,2) DEFAULT 0.00,
    other text,
    created_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
    updated_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT salary_attenday_attenday_number_check CHECK ((attenday_number >= 0)),
    CONSTRAINT salary_attenday_value_check CHECK ((value >= (0)::numeric))
);


ALTER TABLE public.salary_attenday OWNER TO postgres;

--
-- Name: salary_attenday_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.salary_attenday_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.salary_attenday_id_seq OWNER TO postgres;

--
-- Name: salary_attenday_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.salary_attenday_id_seq OWNED BY public.salary_attenday.id;


--
-- Name: salary_category; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.salary_category (
    id integer NOT NULL,
    cast_id integer NOT NULL,
    category_id integer NOT NULL,
    value numeric(10,2) DEFAULT 0.00,
    other text,
    created_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
    updated_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT salary_category_value_check CHECK ((value >= ('-1'::integer)::numeric))
);


ALTER TABLE public.salary_category OWNER TO postgres;

--
-- Name: salary_category_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.salary_category_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.salary_category_id_seq OWNER TO postgres;

--
-- Name: salary_category_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.salary_category_id_seq OWNED BY public.salary_category.id;


--
-- Name: salary_full; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.salary_full (
    id integer NOT NULL,
    category_id integer NOT NULL,
    other text,
    created_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
    updated_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP
);


ALTER TABLE public.salary_full OWNER TO postgres;

--
-- Name: salary_full_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.salary_full_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.salary_full_id_seq OWNER TO postgres;

--
-- Name: salary_full_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.salary_full_id_seq OWNED BY public.salary_full.id;


--
-- Name: salary_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.salary_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.salary_id_seq OWNER TO postgres;

--
-- Name: salary_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.salary_id_seq OWNED BY public.salary.id;


--
-- Name: salesorder; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.salesorder (
    id integer NOT NULL,
    cast_id integer,
    product_id integer NOT NULL,
    amount integer NOT NULL,
    table_id integer NOT NULL,
    session_id integer NOT NULL,
    unit_price numeric(10,2) NOT NULL,
    total_price numeric(10,2) NOT NULL,
    status character varying(20) DEFAULT 'pending'::character varying,
    created_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
    updated_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
    accepted_at timestamp with time zone,
    accepted_by integer,
    for_cast integer DEFAULT 0,
    CONSTRAINT salesorder_amount_check CHECK ((amount > 0)),
    CONSTRAINT salesorder_for_cast_check CHECK ((for_cast = ANY (ARRAY[0, 1]))),
    CONSTRAINT salesorder_status_check CHECK (((status)::text = ANY ((ARRAY['pending'::character varying, 'accepted'::character varying, 'rejected'::character varying, 'completed'::character varying])::text[]))),
    CONSTRAINT salesorder_total_price_check CHECK ((total_price >= (0)::numeric)),
    CONSTRAINT salesorder_unit_price_check CHECK ((unit_price >= (0)::numeric))
);


ALTER TABLE public.salesorder OWNER TO postgres;

--
-- Name: salesorder_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.salesorder_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.salesorder_id_seq OWNER TO postgres;

--
-- Name: salesorder_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.salesorder_id_seq OWNED BY public.salesorder.id;


--
-- Name: serviceorder; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.serviceorder (
    id integer NOT NULL,
    cast_id integer,
    service_id integer NOT NULL,
    amount integer NOT NULL,
    table_id integer NOT NULL,
    session_id integer NOT NULL,
    status character varying(20) DEFAULT 'pending'::character varying,
    created_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
    updated_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
    accepted_by integer,
    accepted_at timestamp with time zone,
    CONSTRAINT serviceorder_amount_check CHECK ((amount > 0)),
    CONSTRAINT serviceorder_status_check CHECK (((status)::text = ANY ((ARRAY['pending'::character varying, 'accepted'::character varying, 'rejected'::character varying, 'completed'::character varying])::text[])))
);


ALTER TABLE public.serviceorder OWNER TO postgres;

--
-- Name: serviceorder_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.serviceorder_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.serviceorder_id_seq OWNER TO postgres;

--
-- Name: serviceorder_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.serviceorder_id_seq OWNED BY public.serviceorder.id;


--
-- Name: services; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.services (
    id integer NOT NULL,
    name character varying(100) NOT NULL,
    other text,
    created_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
    updated_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP
);


ALTER TABLE public.services OWNER TO postgres;

--
-- Name: services_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.services_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.services_id_seq OWNER TO postgres;

--
-- Name: services_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.services_id_seq OWNED BY public.services.id;


--
-- Name: sessions; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.sessions (
    id integer NOT NULL,
    table_id integer NOT NULL,
    cost numeric(10,2) DEFAULT 0.00,
    end_at timestamp with time zone,
    created_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
    updated_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
    set_count integer DEFAULT 1,
    client integer DEFAULT 0,
    status integer DEFAULT 0,
    set_extensions jsonb DEFAULT '[]'::jsonb,
    is_paused boolean DEFAULT false,
    paused_at timestamp with time zone,
    paused_elapsed integer DEFAULT 0,
    CONSTRAINT sessions_client_check CHECK ((client >= 0)),
    CONSTRAINT sessions_set_count_check CHECK ((set_count >= 1)),
    CONSTRAINT sessions_status_check CHECK ((status = ANY (ARRAY[0, 1])))
);


ALTER TABLE public.sessions OWNER TO postgres;

--
-- Name: COLUMN sessions.is_paused; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON COLUMN public.sessions.is_paused IS 'セッションが停止中かどうか';


--
-- Name: COLUMN sessions.paused_at; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON COLUMN public.sessions.paused_at IS '最後に停止した時刻';


--
-- Name: COLUMN sessions.paused_elapsed; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON COLUMN public.sessions.paused_elapsed IS '累積停止時間（秒）';


--
-- Name: sessions_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.sessions_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.sessions_id_seq OWNER TO postgres;

--
-- Name: sessions_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.sessions_id_seq OWNED BY public.sessions.id;


--
-- Name: shift; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.shift (
    id integer NOT NULL,
    cast_id integer NOT NULL,
    date date NOT NULL,
    created_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
    updated_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP
);


ALTER TABLE public.shift OWNER TO postgres;

--
-- Name: TABLE shift; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON TABLE public.shift IS 'キャストのシフト（出勤予約日）管理テーブル';


--
-- Name: COLUMN shift.cast_id; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON COLUMN public.shift.cast_id IS 'キャストID（userテーブルのid）';


--
-- Name: COLUMN shift.date; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON COLUMN public.shift.date IS '出勤予約日';


--
-- Name: shift_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.shift_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.shift_id_seq OWNER TO postgres;

--
-- Name: shift_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.shift_id_seq OWNED BY public.shift.id;


--
-- Name: table; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public."table" (
    id integer NOT NULL,
    name character varying(100) NOT NULL,
    capacity integer NOT NULL,
    other text,
    created_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
    updated_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT table_capacity_check CHECK ((capacity > 0))
);


ALTER TABLE public."table" OWNER TO postgres;

--
-- Name: table_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.table_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.table_id_seq OWNER TO postgres;

--
-- Name: table_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.table_id_seq OWNED BY public."table".id;


--
-- Name: user; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public."user" (
    id integer NOT NULL,
    name character varying(100) NOT NULL,
    mail character varying(255) NOT NULL,
    password character varying(255) NOT NULL,
    role character varying(50) NOT NULL,
    drink_back numeric(5,2) DEFAULT 0.00,
    food_back numeric(5,2) DEFAULT 0.00,
    main_nomination numeric(5,2) DEFAULT 0.00,
    inside_nomination numeric(5,2) DEFAULT 0.00,
    created_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
    updated_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
    other text,
    hourly_price numeric(10,2) DEFAULT 0.00,
    together_nomination numeric(5,2) DEFAULT 0.00,
    attendance_status integer DEFAULT 0,
    CONSTRAINT user_bottle_back_check CHECK (((drink_back >= (0)::numeric) AND (drink_back <= (100)::numeric))),
    CONSTRAINT user_drink_back_check CHECK (((food_back >= (0)::numeric) AND (food_back <= (100)::numeric))),
    CONSTRAINT user_hourly_price_check CHECK ((hourly_price >= (0)::numeric)),
    CONSTRAINT user_inside_nomination_check CHECK (((inside_nomination >= (0)::numeric) AND (inside_nomination <= (100)::numeric))),
    CONSTRAINT user_main_nomination_check CHECK (((main_nomination >= (0)::numeric) AND (main_nomination <= (100)::numeric))),
    CONSTRAINT user_role_check CHECK (((role)::text = ANY ((ARRAY['admin'::character varying, 'cast'::character varying, 'manager'::character varying])::text[]))),
    CONSTRAINT user_together_nomination_check CHECK (((together_nomination >= (0)::numeric) AND (together_nomination <= (100)::numeric)))
);


ALTER TABLE public."user" OWNER TO postgres;

--
-- Name: COLUMN "user".attendance_status; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON COLUMN public."user".attendance_status IS '出勤状態: 0=退勤, 1=出勤中';


--
-- Name: user_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.user_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.user_id_seq OWNER TO postgres;

--
-- Name: user_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.user_id_seq OWNED BY public."user".id;


--
-- Name: add_charges id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.add_charges ALTER COLUMN id SET DEFAULT nextval('public.add_charges_id_seq'::regclass);


--
-- Name: additional_services id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.additional_services ALTER COLUMN id SET DEFAULT nextval('public.additional_services_id_seq'::regclass);


--
-- Name: attendance id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.attendance ALTER COLUMN id SET DEFAULT nextval('public.attendance_id_seq'::regclass);


--
-- Name: bottle_keep id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.bottle_keep ALTER COLUMN id SET DEFAULT nextval('public.bottle_keep_id_seq'::regclass);


--
-- Name: callmanager id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.callmanager ALTER COLUMN id SET DEFAULT nextval('public.callmanager_id_seq'::regclass);


--
-- Name: category id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.category ALTER COLUMN id SET DEFAULT nextval('public.category_id_seq'::regclass);


--
-- Name: nomination id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.nomination ALTER COLUMN id SET DEFAULT nextval('public.nomination_id_seq'::regclass);


--
-- Name: product id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.product ALTER COLUMN id SET DEFAULT nextval('public.product_id_seq'::regclass);


--
-- Name: project_variable id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.project_variable ALTER COLUMN id SET DEFAULT nextval('public.project_variable_id_seq'::regclass);


--
-- Name: salary id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.salary ALTER COLUMN id SET DEFAULT nextval('public.salary_id_seq'::regclass);


--
-- Name: salary_attenday id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.salary_attenday ALTER COLUMN id SET DEFAULT nextval('public.salary_attenday_id_seq'::regclass);


--
-- Name: salary_category id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.salary_category ALTER COLUMN id SET DEFAULT nextval('public.salary_category_id_seq'::regclass);


--
-- Name: salary_full id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.salary_full ALTER COLUMN id SET DEFAULT nextval('public.salary_full_id_seq'::regclass);


--
-- Name: salesorder id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.salesorder ALTER COLUMN id SET DEFAULT nextval('public.salesorder_id_seq'::regclass);


--
-- Name: serviceorder id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.serviceorder ALTER COLUMN id SET DEFAULT nextval('public.serviceorder_id_seq'::regclass);


--
-- Name: services id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.services ALTER COLUMN id SET DEFAULT nextval('public.services_id_seq'::regclass);


--
-- Name: sessions id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.sessions ALTER COLUMN id SET DEFAULT nextval('public.sessions_id_seq'::regclass);


--
-- Name: shift id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.shift ALTER COLUMN id SET DEFAULT nextval('public.shift_id_seq'::regclass);


--
-- Name: table id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public."table" ALTER COLUMN id SET DEFAULT nextval('public.table_id_seq'::regclass);


--
-- Name: user id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public."user" ALTER COLUMN id SET DEFAULT nextval('public.user_id_seq'::regclass);


--
-- Data for Name: add_charges; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.add_charges (id, charge_name, value, other, created_at, updated_at) FROM stdin;
6	song_room	6000.00	1曲	2025-11-11 02:09:26.583104+09	2025-11-11 17:08:54.266835+09
1	main	1320.00	来店時に発生する本指名料です。	2025-11-11 02:09:26.583104+09	2025-11-14 12:52:06.648144+09
2	inside	2000.00	店内滞在に対して発生する本指名料です。	2025-11-11 02:09:26.583104+09	2025-11-14 12:52:18.564376+09
3	together	3000.00	キャストとの同伴にかかる料金です。	2025-11-11 02:09:26.583104+09	2025-11-14 12:52:31.597183+09
4	bottle_keep	4000.00	ボトルをキープする際に発生する料金です。	2025-11-11 02:09:26.583104+09	2025-11-14 12:52:37.046402+09
5	vip_room	5000.00	VIPルーム利用時の追加料金です。	2025-11-11 02:09:26.583104+09	2025-11-14 12:52:46.077853+09
22525	standard_date	5.00	\N	2025-12-12 22:28:56.106898+09	2025-12-13 05:56:34.14802+09
22526	regular	1900.00	\N	2025-12-12 22:28:56.261348+09	2025-12-13 05:56:34.266213+09
22527	arubaito	1700.00	\N	2025-12-12 22:28:56.264605+09	2025-12-13 05:56:34.267392+09
\.


--
-- Data for Name: additional_services; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.additional_services (id, session_id, service_type, count, charge, created_at, updated_at) FROM stdin;
1	184	vip_room	2	10000.00	2025-11-15 17:15:39.853366+09	2025-11-15 17:15:39.853366+09
2	184	vip_room	3	15000.00	2025-11-15 17:39:34.100119+09	2025-11-15 17:39:34.100119+09
3	190	vip_room	2	10000.00	2025-11-18 13:47:01.33095+09	2025-11-18 13:47:01.33095+09
4	202	vip_room	5	25000.00	2025-11-18 15:59:54.220076+09	2025-11-18 15:59:54.220076+09
5	203	vip_room	322	1610000.00	2025-11-18 16:02:56.971121+09	2025-11-18 16:02:56.971121+09
6	215	vip_room	3	15000.00	2025-11-18 16:45:17.660941+09	2025-11-18 16:45:17.660941+09
7	227	vip_room	5	25000.00	2025-11-18 17:12:25.44553+09	2025-11-18 17:12:25.44553+09
\.


--
-- Data for Name: attendance; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.attendance (id, staff_id, clock_in, clock_out, total_work_hours, comment, detailed_times, status, approved_by, approved_at, created_at, updated_at) FROM stdin;
5	1	2025-10-25 01:08:28.193+09	2025-10-25 01:08:42.847+09	0.00	2132132	[{"id": "timer_1761322108193", "endTime": "2025-10-24T16:08:39.536Z", "duration": 11, "startTime": "2025-10-24T16:08:28.193Z"}]	saved	1	2025-10-25 01:41:43.277561+09	2025-10-25 01:08:42.895825+09	2025-10-25 01:41:43.277561+09
7	1	2025-10-25 01:25:31.448+09	2025-10-25 01:25:48.873+09	0.00		[{"id": "timer_1761323131448", "endTime": "2025-10-24T16:25:47.623Z", "duration": 16, "startTime": "2025-10-24T16:25:31.448Z"}]	saved	1	2025-10-25 01:42:42.849159+09	2025-10-25 01:25:49.140635+09	2025-10-25 01:42:42.849159+09
2	1	2025-10-25 00:38:12.114+09	2025-10-25 00:38:55.239+09	0.01	123123	[{"id": "timer_1761320292114", "endTime": "2025-10-24T15:38:17.073Z", "duration": 4, "startTime": "2025-10-24T15:38:12.114Z"}, {"id": "timer_1761320298865", "endTime": "2025-10-24T15:38:27.465Z", "duration": 8, "startTime": "2025-10-24T15:38:18.865Z"}, {"id": "timer_1761320309819", "endTime": "2025-10-24T15:38:50.721Z", "duration": 20, "startTime": "2025-10-24T15:38:29.819Z"}]	saved	1	2025-10-25 00:46:01.986854+09	2025-10-25 00:38:55.537539+09	2025-10-25 00:46:01.986854+09
3	1	2025-10-25 00:49:12.729+09	2025-10-25 00:51:37.45+09	0.02	sdfsdffsd	[{"id": "timer_1761320952729", "endTime": "2025-10-24T15:49:17.673Z", "duration": 4, "startTime": "2025-10-24T15:49:12.729Z"}, {"id": "timer_1761320958609", "endTime": "2025-10-24T15:49:22.585Z", "duration": 3, "startTime": "2025-10-24T15:49:18.609Z"}, {"id": "timer_1761320986168", "endTime": "2025-10-24T15:49:48.600Z", "duration": 2, "startTime": "2025-10-24T15:49:46.168Z"}, {"id": "timer_1761321029153", "endTime": "2025-10-24T15:50:56.241Z", "duration": 27, "startTime": "2025-10-24T15:50:29.152Z"}, {"id": "timer_1761321059425", "endTime": "2025-10-24T15:51:25.738Z", "duration": 26, "startTime": "2025-10-24T15:50:59.425Z"}, {"id": "timer_1761321087240", "endTime": "2025-10-24T15:51:28.864Z", "duration": 1, "startTime": "2025-10-24T15:51:27.240Z"}, {"id": "timer_1761321090241", "endTime": "2025-10-24T15:51:31.074Z", "duration": 0, "startTime": "2025-10-24T15:51:30.241Z"}]	saved	1	2025-10-25 00:55:47.091664+09	2025-10-25 00:51:37.764912+09	2025-10-25 00:55:47.091664+09
29	5	2025-12-11 22:08:25.459+09	2025-12-11 22:13:44.543+09	0.09		[{"id": "timer_1765458505459", "endTime": "2025-12-11T13:13:41.923Z", "duration": 316, "startTime": "2025-12-11T13:08:25.459Z"}]	pending	\N	\N	2025-12-11 22:13:44.848435+09	2025-12-11 22:13:44.848435+09
8	1	2025-12-08 01:40:55.615+09	2025-10-25 01:41:14.966+09	0.00	321654987	[{"id": "timer_1761324055615", "endTime": "2025-10-24T16:41:01.506Z", "duration": 5, "startTime": "2025-10-24T16:40:55.615Z"}]	saved	1	2025-10-25 01:42:44.399071+09	2025-10-25 01:41:15.006929+09	2025-12-14 14:10:04.519206+09
4	1	2025-10-25 01:01:16.384+09	2025-10-25 01:01:24.802+09	0.00		[{"id": "timer_1761321676384", "endTime": "2025-10-24T16:01:16.705Z", "duration": 0, "startTime": "2025-10-24T16:01:16.384Z"}, {"id": "timer_1761321676880", "endTime": "2025-10-24T16:01:17.140Z", "duration": 0, "startTime": "2025-10-24T16:01:16.880Z"}, {"id": "timer_1761321677288", "endTime": "2025-10-24T16:01:17.431Z", "duration": 0, "startTime": "2025-10-24T16:01:17.288Z"}, {"id": "timer_1761321678520", "endTime": "2025-10-24T16:01:22.136Z", "duration": 3, "startTime": "2025-10-24T16:01:18.520Z"}]	saved	1	2025-10-25 01:41:39.498833+09	2025-10-25 01:01:24.845516+09	2025-10-25 01:41:39.498833+09
10	5	2025-10-25 02:42:48.451+09	2025-10-25 02:56:06.805+09	0.00		[{"id": "timer_1761327768451", "endTime": "2025-10-24T17:42:52.129Z", "duration": 3, "startTime": "2025-10-24T17:42:48.451Z"}, {"id": "timer_1761327772972", "endTime": "2025-10-24T17:42:58.132Z", "duration": 5, "startTime": "2025-10-24T17:42:52.972Z"}]	saved	1	2025-10-25 02:56:46.217896+09	2025-10-25 02:56:07.38156+09	2025-10-25 02:56:46.217896+09
11	4	2025-10-25 10:48:43.286+09	2025-10-25 10:49:20.309+09	0.01	4546	[{"id": "timer_1761356923286", "endTime": "2025-10-25T01:48:53.230Z", "duration": 9, "startTime": "2025-10-25T01:48:43.286Z"}, {"id": "timer_1761356936540", "endTime": "2025-10-25T01:49:03.502Z", "duration": 6, "startTime": "2025-10-25T01:48:56.540Z"}, {"id": "timer_1761356944870", "endTime": "2025-10-25T01:49:12.174Z", "duration": 7, "startTime": "2025-10-25T01:49:04.870Z"}]	saved	1	2025-10-25 10:49:41.714617+09	2025-10-25 10:49:20.57957+09	2025-10-25 10:49:41.714617+09
12	4	2025-10-26 01:13:33.142+09	2025-10-26 01:14:15.27+09	0.01	123132	[{"id": "timer_1761408813142", "endTime": "2025-10-25T16:14:05.430Z", "duration": 32, "startTime": "2025-10-25T16:13:33.142Z"}, {"id": "timer_1761408848174", "endTime": "2025-10-25T16:14:10.262Z", "duration": 2, "startTime": "2025-10-25T16:14:08.174Z"}]	saved	1	2025-10-26 01:23:29.428903+09	2025-10-26 01:14:15.295394+09	2025-10-26 01:23:29.428903+09
13	4	2025-10-26 01:22:15.668+09	2025-10-26 01:22:28.89+09	0.00	wrtwrtwrt	[{"id": "timer_1761409335668", "endTime": "2025-10-25T16:22:22.399Z", "duration": 6, "startTime": "2025-10-25T16:22:15.668Z"}, {"id": "timer_1761409343370", "endTime": "2025-10-25T16:22:23.996Z", "duration": 0, "startTime": "2025-10-25T16:22:23.370Z"}]	saved	1	2025-10-26 01:23:31.334825+09	2025-10-26 01:22:29.389746+09	2025-10-26 01:23:31.334825+09
6	1	2025-10-25 01:10:22.056+09	2025-10-25 01:18:08.724+09	0.02		[{"id": "timer_1761322222056", "endTime": "2025-10-24T16:11:01.224Z", "duration": 39, "startTime": "2025-10-24T16:10:22.056Z"}, {"id": "timer_1761322664488", "endTime": "2025-10-24T16:18:03.072Z", "duration": 18, "startTime": "2025-10-24T16:17:44.488Z"}]	saved	1	2025-10-25 01:41:41.48754+09	2025-10-25 01:18:09.027176+09	2025-10-30 01:55:29.19804+09
14	4	2025-10-26 01:22:47.071+09	2025-10-26 01:23:00.348+09	0.00	222222222	[{"id": "timer_1761409367071", "endTime": "2025-10-25T16:22:49.553Z", "duration": 2, "startTime": "2025-10-25T16:22:47.071Z"}, {"id": "timer_1761409370047", "endTime": "2025-10-25T16:22:53.079Z", "duration": 3, "startTime": "2025-10-25T16:22:50.047Z"}, {"id": "timer_1761409373687", "endTime": "2025-10-25T16:22:54.647Z", "duration": 0, "startTime": "2025-10-25T16:22:53.687Z"}, {"id": "timer_1761409375368", "endTime": "2025-10-25T16:22:56.600Z", "duration": 1, "startTime": "2025-10-25T16:22:55.368Z"}]	saved	1	2025-10-26 01:23:33.374481+09	2025-10-26 01:23:00.374831+09	2025-10-26 01:23:33.374481+09
30	5	2025-12-11 22:13:53.003+09	2025-12-11 22:14:05.852+09	0.00		[{"id": "timer_1765458833003", "endTime": "2025-12-11T13:13:54.322Z", "duration": 1, "startTime": "2025-12-11T13:13:53.003Z"}]	pending	\N	\N	2025-12-11 22:14:05.882478+09	2025-12-11 22:14:05.882478+09
15	4	2025-10-26 01:24:04.641+09	2025-10-26 01:24:17.914+09	0.00	1111	[{"id": "timer_1761409444641", "endTime": "2025-10-25T16:24:07.231Z", "duration": 2, "startTime": "2025-10-25T16:24:04.641Z"}, {"id": "timer_1761409450424", "endTime": "2025-10-25T16:24:13.807Z", "duration": 3, "startTime": "2025-10-25T16:24:10.424Z"}]	saved	1	2025-10-26 01:30:06.197492+09	2025-10-26 01:24:17.949183+09	2025-10-26 01:30:06.197492+09
17	4	2025-10-26 01:26:15.087+09	2025-10-26 01:26:41.9+09	0.00	333	[{"id": "timer_1761409575087", "endTime": "2025-10-25T16:26:21.999Z", "duration": 6, "startTime": "2025-10-25T16:26:15.087Z"}, {"id": "timer_1761409583759", "endTime": "2025-10-25T16:26:31.583Z", "duration": 7, "startTime": "2025-10-25T16:26:23.759Z"}, {"id": "timer_1761409593271", "endTime": "2025-10-25T16:26:34.975Z", "duration": 1, "startTime": "2025-10-25T16:26:33.271Z"}]	saved	1	2025-10-26 01:30:09.408577+09	2025-10-26 01:26:41.938378+09	2025-10-26 01:30:09.408577+09
24	4	2025-12-04 11:01:34+09	2025-11-04 11:01:41.61+09	0.00	23	[{"id": "timer_1762221694354", "endTime": "2025-11-04T02:01:37.283Z", "duration": 2, "startTime": "2025-11-04T02:01:34.354Z"}]	saved	1	2025-11-04 15:22:05.971756+09	2025-11-04 11:01:42.479652+09	2025-12-12 23:12:05.715876+09
28	5	2025-12-03 15:23:28+09	2025-11-12 15:23:49.052+09	1.20	132	[{"id": "timer_1762928608325", "endTime": "2025-11-12T06:23:42.933Z", "duration": 14, "startTime": "2025-11-12T06:23:28.325Z"}]	saved	1	2025-11-12 15:24:00.0923+09	2025-11-12 15:23:49.548943+09	2025-12-12 23:12:25.735736+09
25	1	2025-12-02 15:21:44+09	2025-11-04 15:22:29.207+09	1.51	121654	[{"id": "timer_1762237304057", "endTime": "2025-11-04T06:22:21.477Z", "duration": 37, "startTime": "2025-11-04T06:21:44.057Z"}]	saved	1	2025-11-04 15:27:54.400466+09	2025-11-04 15:22:29.557577+09	2025-12-12 23:12:50.693185+09
18	4	2025-12-09 01:28:44.767+09	2025-10-26 01:28:59.398+09	0.00	1111	[{"id": "timer_1761409724767", "endTime": "2025-10-25T16:28:58.294Z", "duration": 13, "startTime": "2025-10-25T16:28:44.767Z"}]	saved	1	2025-10-26 01:30:11.134281+09	2025-10-26 01:28:59.430574+09	2025-12-14 14:09:40.202844+09
22	4	2025-10-26 01:37:32.454+09	2025-10-26 01:41:55.902+09	0.01	456789	[{"id": "timer_1761410252454", "endTime": "2025-10-25T16:37:35.636Z", "duration": 3, "startTime": "2025-10-25T16:37:32.454Z"}, {"id": "timer_1761410257062", "endTime": "2025-10-25T16:37:45.198Z", "duration": 8, "startTime": "2025-10-25T16:37:37.062Z"}, {"id": "timer_1761410267174", "endTime": "2025-10-25T16:37:54.103Z", "duration": 6, "startTime": "2025-10-25T16:37:47.174Z"}, {"id": "timer_1761410275958", "endTime": "2025-10-25T16:38:08.334Z", "duration": 12, "startTime": "2025-10-25T16:37:55.958Z"}]	saved	1	2025-10-26 01:52:58.280357+09	2025-10-26 01:41:56.23801+09	2025-10-26 01:52:58.280357+09
19	4	2025-10-26 01:32:36.847+09	2025-10-26 01:32:49.77+09	0.00	111	[{"id": "timer_1761409956847", "endTime": "2025-10-25T16:32:40.088Z", "duration": 3, "startTime": "2025-10-25T16:32:36.847Z"}, {"id": "timer_1761409961887", "endTime": "2025-10-25T16:32:45.559Z", "duration": 3, "startTime": "2025-10-25T16:32:41.887Z"}]	saved	1	2025-11-04 00:43:56.119235+09	2025-10-26 01:32:49.800896+09	2025-11-04 00:43:56.119235+09
20	4	2025-10-26 01:32:56.446+09	2025-10-26 01:33:14.664+09	0.00	222	[{"id": "timer_1761409976446", "endTime": "2025-10-25T16:33:01.086Z", "duration": 4, "startTime": "2025-10-25T16:32:56.446Z"}, {"id": "timer_1761409982478", "endTime": "2025-10-25T16:33:09.071Z", "duration": 6, "startTime": "2025-10-25T16:33:02.478Z"}]	saved	1	2025-11-04 00:44:56.747957+09	2025-10-26 01:33:14.696558+09	2025-11-04 00:44:56.747957+09
16	4	2025-12-08 01:24:20.619+09	2025-10-26 01:24:36.54+09	0.00	222222	[{"id": "timer_1761409460619", "endTime": "2025-10-25T16:24:23.031Z", "duration": 2, "startTime": "2025-10-25T16:24:20.619Z"}, {"id": "timer_1761409465327", "endTime": "2025-10-25T16:24:32.191Z", "duration": 6, "startTime": "2025-10-25T16:24:25.327Z"}]	saved	1	2025-10-26 01:30:07.896171+09	2025-10-26 01:24:36.56942+09	2025-12-14 14:09:51.764398+09
27	4	2025-11-04 15:28:21.144+09	2025-11-04 15:28:25.116+09	5.43		[{"id": "timer_1762237701144", "endTime": "2025-11-04T06:28:23.552Z", "duration": 2, "startTime": "2025-11-04T06:28:21.144Z"}]	saved	1	2025-11-04 15:29:29.301018+09	2025-11-04 15:28:25.724019+09	2025-11-12 15:27:09.648162+09
26	4	2025-11-04 15:26:22.562+09	2025-11-04 15:27:41.29+09	5.21		[{"id": "timer_1762237582562", "endTime": "2025-11-04T06:26:25.073Z", "duration": 2, "startTime": "2025-11-04T06:26:22.562Z"}, {"id": "timer_1762237641219", "endTime": "2025-11-04T06:27:39.697Z", "duration": 18, "startTime": "2025-11-04T06:27:21.219Z"}]	saved	1	2025-11-04 15:28:00.313711+09	2025-11-04 15:27:41.500866+09	2025-11-12 15:27:18.314592+09
21	4	2025-10-26 01:34:38.997+09	2025-10-26 01:35:58.134+09	4.91	123456	[{"id": "timer_1761410078997", "endTime": "2025-10-25T16:35:53.590Z", "duration": 74, "startTime": "2025-10-25T16:34:38.997Z"}]	saved	1	2025-11-04 15:22:16.295503+09	2025-10-26 01:35:58.84935+09	2025-11-12 15:27:38.000366+09
31	5	2025-12-11 22:14:12.858+09	2025-12-11 22:26:46.309+09	0.18		[{"id": "timer_1765458852858", "endTime": "2025-12-11T13:14:18.106Z", "duration": 5, "startTime": "2025-12-11T13:14:12.858Z"}, {"id": "timer_1765458942107", "endTime": "2025-12-11T13:26:32.953Z", "duration": 650, "startTime": "2025-12-11T13:15:42.107Z"}, {"id": "timer_1765459594761", "endTime": "2025-12-11T13:26:44.771Z", "duration": 10, "startTime": "2025-12-11T13:26:34.761Z"}]	pending	\N	\N	2025-12-11 22:26:46.69818+09	2025-12-11 22:26:46.69818+09
23	4	2025-12-02 01:37:32.454+09	2025-11-04 10:54:07.566+09	8.21	123	[{"id": "timer_1762221221819", "endTime": "2025-11-04T01:53:45.715Z", "duration": 3, "startTime": "2025-11-04T01:53:41.819Z"}, {"id": "timer_1762221226468", "endTime": "2025-11-04T01:53:48.851Z", "duration": 2, "startTime": "2025-11-04T01:53:46.468Z"}, {"id": "timer_1762221229379", "endTime": "2025-11-04T01:53:50.539Z", "duration": 1, "startTime": "2025-11-04T01:53:49.379Z"}]	saved	1	2025-11-04 15:22:13.186422+09	2025-11-04 10:54:07.68882+09	2025-12-12 23:31:30.244135+09
9	1	2025-12-01 22:13:53.003+09	2025-10-25 02:36:15.035+09	0.01	sefsdfefefsdfefwfwef	[{"id": "timer_1761327342708", "endTime": "2025-10-24T17:35:59.604Z", "duration": 16, "startTime": "2025-10-24T17:35:42.708Z"}, {"id": "timer_1761327361004", "endTime": "2025-10-24T17:36:06.244Z", "duration": 5, "startTime": "2025-10-24T17:36:01.004Z"}]	saved	1	2025-10-25 02:56:44.482854+09	2025-10-25 02:36:15.563012+09	2025-12-13 00:32:55.675127+09
\.


--
-- Data for Name: bottle_keep; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.bottle_keep (id, client_name, client_email, bottle_name, amount, session_id, table_id, other, created_at, updated_at) FROM stdin;
1	yamada	yamada@example.com	wisky0.056	300	87	2	\N	2025-11-11 17:13:46.457819+09	2025-11-13 01:42:21.940784+09
\.


--
-- Data for Name: callmanager; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.callmanager (id, cast_id, table_id, session_id, calltype, status, accepted_at, accepted_by, created_at, updated_at) FROM stdin;
1	4	5	53	manager	accepted	2025-10-28 09:12:52.23164+09	1	2025-10-28 09:05:46.78236+09	2025-10-28 09:12:52.23164+09
20	8	5	187	service	accepted	2025-11-18 12:50:01.040035+09	1	2025-11-18 12:48:58.041523+09	2025-11-18 12:50:01.040035+09
2	5	5	54	manager	rejected	2025-10-28 09:21:33.920528+09	1	2025-10-28 09:20:59.395869+09	2025-10-28 09:21:33.920528+09
3	4	5	55	manager	accepted	2025-10-28 09:28:16.456196+09	1	2025-10-28 09:23:08.264624+09	2025-10-28 09:28:16.456196+09
24	5	5	188	service	accepted	2025-11-18 13:35:57.400312+09	1	2025-11-18 12:53:10.032386+09	2025-11-18 13:35:57.400312+09
4	4	5	56	manager	accepted	2025-10-28 09:33:07.582918+09	1	2025-10-28 09:28:34.4049+09	2025-10-28 09:33:07.582918+09
25	\N	5	189	service	accepted	2025-11-18 13:36:15.50064+09	1	2025-11-18 13:36:11.477989+09	2025-11-18 13:36:15.50064+09
5	5	5	57	manager	accepted	2025-10-28 09:44:30.95654+09	1	2025-10-28 09:33:26.599662+09	2025-10-28 09:44:30.95654+09
6	4	5	58	manager	accepted	2025-10-28 09:50:29.09266+09	1	2025-10-28 09:45:05.029907+09	2025-10-28 09:50:29.09266+09
26	\N	1	251	service	accepted	2025-11-19 00:38:29.891958+09	1	2025-11-19 00:36:50.388917+09	2025-11-19 00:38:29.891958+09
7	5	5	59	manager	accepted	2025-10-28 10:49:17.084127+09	1	2025-10-28 09:53:27.054501+09	2025-10-28 10:49:17.084127+09
8	4	5	60	manager	accepted	2025-10-28 10:50:03.785869+09	1	2025-10-28 10:49:50.671417+09	2025-10-28 10:50:03.785869+09
27	\N	1	252	service	accepted	2025-11-19 00:39:29.932093+09	1	2025-11-19 00:38:46.083495+09	2025-11-19 00:39:29.932093+09
9	4	5	62	manager	accepted	2025-10-28 11:57:32.22029+09	1	2025-10-28 11:57:19.660844+09	2025-10-28 11:57:32.22029+09
10	4	5	63	manager	accepted	2025-10-28 11:58:00.089037+09	1	2025-10-28 11:57:54.401039+09	2025-10-28 11:58:00.089037+09
28	\N	1	253	service	accepted	2025-11-19 00:59:00.299983+09	1	2025-11-19 00:40:14.091534+09	2025-11-19 00:59:00.299983+09
11	4	4	64	manager	accepted	2025-10-28 12:40:08.38715+09	1	2025-10-28 12:40:00.35227+09	2025-10-28 12:40:08.38715+09
12	4	4	65	manager	accepted	2025-10-28 12:44:52.680561+09	1	2025-10-28 12:44:44.411154+09	2025-10-28 12:44:52.680561+09
29	1	1	254	service	accepted	2025-11-19 01:01:29.753018+09	1	2025-11-19 00:59:15.144648+09	2025-11-19 01:01:29.753018+09
13	8	3	81	manager	accepted	2025-11-04 09:33:32.901108+09	1	2025-11-04 02:25:23.327198+09	2025-11-04 09:33:32.901108+09
14	8	2	88	manager	accepted	2025-11-11 17:26:57.290602+09	1	2025-11-11 17:26:45.497999+09	2025-11-11 17:26:57.290602+09
30	\N	1	255	service	accepted	2025-11-19 01:16:34.037104+09	1	2025-11-19 01:16:08.045696+09	2025-11-19 01:16:34.037104+09
15	5	3	156	service	accepted	2025-11-13 11:40:20.709465+09	1	2025-11-13 11:39:24.504971+09	2025-11-13 11:40:20.709465+09
16	10	3	157	service	accepted	2025-11-13 11:40:59.915288+09	1	2025-11-13 11:40:40.848879+09	2025-11-13 11:40:59.915288+09
31	\N	1	256	service	accepted	2025-11-19 01:23:02.085878+09	1	2025-11-19 01:17:29.631401+09	2025-11-19 01:23:02.085878+09
17	10	4	163	service	accepted	2025-11-13 23:55:28.107303+09	1	2025-11-13 23:53:05.995661+09	2025-11-13 23:55:28.107303+09
32	\N	1	257	service	accepted	2025-11-19 01:23:24.080033+09	1	2025-11-19 01:23:16.225493+09	2025-11-19 01:23:24.080033+09
33	\N	1	258	service	accepted	2025-11-19 01:31:56.832095+09	1	2025-11-19 01:31:49.020473+09	2025-11-19 01:31:56.832095+09
\.


--
-- Data for Name: category; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.category (id, name, other, created_at, updated_at) FROM stdin;
1	ボトル	11	2025-10-22 21:43:27.137914+09	2025-10-22 21:44:05.165876+09
3	フード	33	2025-10-22 21:43:45.669683+09	2025-10-22 21:44:11.609782+09
4	セット	44ujm6654	2025-10-22 21:43:52.277983+09	2025-10-24 16:48:13.341005+09
2	ドリンク	2264	2025-10-22 21:43:35.581375+09	2025-10-24 16:48:23.383014+09
\.


--
-- Data for Name: nomination; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.nomination (id, cast_id, table_id, session_id, type_id, created_at, updated_at, cost) FROM stdin;
6	8	2	86	together	2025-11-11 16:07:03.958548+09	2025-11-11 16:07:03.958548+09	0.00
7	4	2	86	main	2025-11-11 16:10:36.18127+09	2025-11-11 16:10:36.18127+09	0.00
8	5	2	87	main	2025-11-11 16:18:59.124064+09	2025-11-11 16:18:59.124064+09	0.00
9	4	2	87	inside	2025-11-11 16:19:08.0321+09	2025-11-11 16:19:08.0321+09	0.00
10	9	2	87	together	2025-11-11 16:19:14.291672+09	2025-11-11 16:19:14.291672+09	0.00
12	5	2	95	together	2025-11-11 23:52:46.393291+09	2025-11-11 23:52:46.393291+09	4000.00
13	9	2	95	inside	2025-11-11 23:55:33.676362+09	2025-11-11 23:55:33.676362+09	2000.00
14	5	2	96	together	2025-11-11 23:57:42.953336+09	2025-11-11 23:57:42.953336+09	4000.00
15	8	2	96	main	2025-11-11 23:58:45.301794+09	2025-11-11 23:58:45.301794+09	1000.00
16	9	2	96	main	2025-11-12 00:01:30.90135+09	2025-11-12 00:01:30.90135+09	1000.00
69	5	3	143	main	2025-11-12 23:17:46.558091+09	2025-11-13 00:40:38.499873+09	5280.00
68	8	3	143	inside	2025-11-12 23:16:59.489446+09	2025-11-13 00:40:38.559829+09	10000.00
67	10	3	143	together	2025-11-12 23:16:55.824213+09	2025-11-13 00:40:38.620994+09	9600.00
70	5	3	147	together	2025-11-13 02:44:21.672971+09	2025-11-13 02:44:21.672971+09	4320.00
71	5	3	147	main	2025-11-13 02:44:30.633499+09	2025-11-13 02:44:30.633499+09	1320.00
72	5	3	147	inside	2025-11-13 02:44:45.153499+09	2025-11-13 02:44:45.153499+09	2000.00
73	8	4	151	inside	2025-11-13 10:11:16.639113+09	2025-11-13 10:11:16.639113+09	2000.00
74	9	3	157	inside	2025-11-13 13:44:03.911677+09	2025-11-13 13:44:03.911677+09	2000.00
108	4	3	234	inside	2025-11-18 17:33:56.154297+09	2025-11-18 17:33:56.154297+09	2000.00
75	9	3	160	inside	2025-11-13 15:51:03.417757+09	2025-11-13 17:23:32.685603+09	6000.00
76	9	3	161	inside	2025-11-13 17:43:05.214694+09	2025-11-13 17:43:05.214694+09	2000.00
77	9	3	178	inside	2025-11-14 15:26:49.526972+09	2025-11-14 15:26:49.526972+09	2000.00
109	5	3	237	inside	2025-11-18 17:38:41.39659+09	2025-11-18 17:38:41.39659+09	2000.00
110	4	3	238	main	2025-11-18 17:44:16.329066+09	2025-11-18 17:44:16.329066+09	1320.00
111	5	4	239	inside	2025-11-18 17:49:57.216798+09	2025-11-18 17:49:57.216798+09	2000.00
113	5	4	240	together	2025-11-18 18:43:27.98107+09	2025-11-18 20:20:18.892838+09	6960.00
112	9	4	240	inside	2025-11-18 18:40:39.716393+09	2025-11-18 20:20:38.597234+09	6000.00
114	5	4	241	inside	2025-11-18 20:38:12.826362+09	2025-11-18 20:38:12.826362+09	2000.00
115	10	4	241	together	2025-11-18 20:43:16.710544+09	2025-11-18 20:43:16.710544+09	4320.00
116	10	4	241	together	2025-11-18 20:43:17.866832+09	2025-11-18 20:43:17.866832+09	4320.00
117	10	4	241	together	2025-11-18 20:44:47.684601+09	2025-11-18 20:44:47.684601+09	4320.00
118	9	1	246	main	2025-11-18 21:42:40.274104+09	2025-11-18 21:42:40.274104+09	1320.00
119	8	1	247	main	2025-11-18 22:14:27.55953+09	2025-11-18 22:14:27.55953+09	1320.00
121	8	1	249	main	2025-11-18 23:03:26.775998+09	2025-11-18 23:03:26.775998+09	1320.00
122	9	1	260	together	2025-11-19 01:57:48.289675+09	2025-11-19 01:57:48.289675+09	4320.00
123	8	1	260	inside	2025-11-19 01:58:02.026306+09	2025-11-19 01:58:02.026306+09	2000.00
124	5	1	263	inside	2025-11-19 02:40:24.007822+09	2025-11-19 02:40:24.007822+09	2000.00
126	5	1	266	inside	2025-11-19 03:07:39.658396+09	2025-11-19 08:33:24.238266+09	4000.00
125	8	1	266	together	2025-11-19 03:07:02.348086+09	2025-11-19 08:33:26.019703+09	5640.00
85	9	3	181	together	2025-11-15 14:32:18.798555+09	2025-11-15 16:04:57.932324+09	13560.00
84	10	3	181	together	2025-11-15 14:26:55.162839+09	2025-11-15 16:05:01.664034+09	13560.00
83	4	3	181	together	2025-11-15 14:23:45.171135+09	2025-11-15 16:05:03.369307+09	13560.00
82	9	3	181	together	2025-11-15 12:48:21.204571+09	2025-11-15 16:05:03.938912+09	13560.00
81	8	3	181	inside	2025-11-15 12:26:33.468673+09	2025-11-15 16:05:04.627436+09	16000.00
86	9	3	183	together	2025-11-15 16:18:22.652993+09	2025-11-15 16:18:22.652993+09	4320.00
87	10	1	184	main	2025-11-15 16:57:47.719735+09	2025-11-15 16:57:47.719735+09	1320.00
64	8	3	142	inside	2025-11-12 13:47:35.381751+09	2025-11-12 13:47:35.381751+09	2000.00
65	9	3	142	together	2025-11-12 13:47:38.91636+09	2025-11-12 13:47:38.91636+09	4320.00
66	5	3	142	main	2025-11-12 13:47:46.930034+09	2025-11-12 13:47:46.930034+09	1320.00
91	10	5	190	inside	2025-11-18 13:47:18.757838+09	2025-11-18 13:49:28.732855+09	4000.00
90	9	5	190	main	2025-11-18 13:47:14.434132+09	2025-11-18 13:49:28.780359+09	2640.00
92	8	4	200	together	2025-11-18 15:19:55.104957+09	2025-11-18 15:19:55.104957+09	4320.00
94	4	4	202	main	2025-11-18 15:59:34.653516+09	2025-11-18 15:59:34.653516+09	1320.00
95	5	4	202	inside	2025-11-18 15:59:46.279183+09	2025-11-18 15:59:46.279183+09	2000.00
96	10	4	203	inside	2025-11-18 16:02:43.804318+09	2025-11-18 16:02:43.804318+09	2000.00
98	4	5	212	main	2025-11-18 16:40:50.320737+09	2025-11-18 16:41:18.233944+09	2640.00
97	8	5	212	inside	2025-11-18 16:40:45.638303+09	2025-11-18 16:41:19.408274+09	4000.00
99	8	3	214	main	2025-11-18 16:42:47.395323+09	2025-11-18 16:42:47.395323+09	1320.00
100	8	3	215	inside	2025-11-18 16:45:12.936349+09	2025-11-18 16:45:12.936349+09	2000.00
101	10	3	215	together	2025-11-18 16:48:41.07123+09	2025-11-18 16:48:41.07123+09	4320.00
102	5	3	218	inside	2025-11-18 16:52:04.220164+09	2025-11-18 16:52:04.220164+09	2000.00
103	8	3	225	inside	2025-11-18 17:10:29.478371+09	2025-11-18 17:10:29.478371+09	2000.00
104	8	3	227	inside	2025-11-18 17:12:41.20669+09	2025-11-18 17:12:41.20669+09	2000.00
105	9	3	227	together	2025-11-18 17:12:49.681853+09	2025-11-18 17:12:49.681853+09	4320.00
106	8	3	232	inside	2025-11-18 17:23:19.165798+09	2025-11-18 17:23:19.165798+09	2000.00
107	8	3	233	together	2025-11-18 17:31:44.684815+09	2025-11-18 17:31:44.684815+09	4320.00
\.


--
-- Data for Name: product; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.product (id, category_id, name, sku, sale_price, amount, other, created_at, updated_at) FROM stdin;
3	2	wecet	ex652	54.00	310	4	2025-10-22 22:13:23.14105+09	2025-11-18 17:36:12.531916+09
2	1	wisky	XX0234	150.00	0	sf	2025-10-22 22:12:45.320126+09	2025-11-03 11:42:50.937861+09
9	3	senbi	ek342	50.00	961	ds	2025-10-22 22:16:16.469268+09	2025-11-19 00:40:52.003282+09
10	4	dfsdf	sdf	323.00	134	223	2025-10-24 16:49:23.411233+09	2025-11-19 01:57:32.797122+09
1	1	xo	BEER001	300.00	207	ere	2025-10-22 22:12:06.024918+09	2025-11-19 01:57:53.275586+09
\.


--
-- Data for Name: project_variable; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.project_variable (id, name, value, other, created_at, updated_at) FROM stdin;
1	store_name	銀座エレガンス123	店舗名	2025-11-14 11:39:55.296795+09	2025-11-14 11:46:23.057298+09
\.


--
-- Data for Name: salary; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.salary (id, user_id, year, month, basic_hours, base_pay, main_nomination_count, main_nomination_fee, inside_nomination_count, inside_nomination_fee, drink_back_yen, overtime_wage_yen, deduction_yen, total_pay_yen, created_at, updated_at, food_back_yen, together_nomination_count, together_nomination_fee, together_nomination_cost) FROM stdin;
572	5	2020	11	0.00	0.00	0	0.00	0	0.00	0.00	0.00	0.00	0.00	2025-11-14 13:58:53.72175+09	2025-11-14 13:58:53.72175+09	0.00	0	0.00	0.00
573	4	2020	11	0.00	0.00	0	0.00	0	0.00	0.00	0.00	0.00	0.00	2025-11-14 13:58:53.744113+09	2025-11-14 13:58:53.744113+09	0.00	0	0.00	0.00
574	9	2020	11	0.00	0.00	0	0.00	0	0.00	0.00	0.00	0.00	0.00	2025-11-14 13:58:53.747278+09	2025-11-14 13:58:53.747278+09	0.00	0	0.00	0.00
575	8	2020	11	0.00	0.00	0	0.00	0	0.00	0.00	0.00	0.00	0.00	2025-11-14 13:58:53.750967+09	2025-11-14 13:58:53.750967+09	0.00	0	0.00	0.00
576	10	2020	11	0.00	0.00	0	0.00	0	0.00	0.00	0.00	0.00	0.00	2025-11-14 13:58:53.753843+09	2025-11-14 13:58:53.753843+09	0.00	0	0.00	0.00
577	5	2029	11	0.00	0.00	0	0.00	0	0.00	0.00	0.00	0.00	0.00	2025-11-14 13:58:55.286808+09	2025-11-14 13:58:55.286808+09	0.00	0	0.00	0.00
578	4	2029	11	0.00	0.00	0	0.00	0	0.00	0.00	0.00	0.00	0.00	2025-11-14 13:58:55.316772+09	2025-11-14 13:58:55.316772+09	0.00	0	0.00	0.00
579	9	2029	11	0.00	0.00	0	0.00	0	0.00	0.00	0.00	0.00	0.00	2025-11-14 13:58:55.319739+09	2025-11-14 13:58:55.319739+09	0.00	0	0.00	0.00
580	8	2029	11	0.00	0.00	0	0.00	0	0.00	0.00	0.00	0.00	0.00	2025-11-14 13:58:55.322821+09	2025-11-14 13:58:55.322821+09	0.00	0	0.00	0.00
581	10	2029	11	0.00	0.00	0	0.00	0	0.00	0.00	0.00	0.00	0.00	2025-11-14 13:58:55.326118+09	2025-11-14 13:58:55.326118+09	0.00	0	0.00	0.00
587	5	2024	10	0.00	0.00	0	0.00	0	0.00	0.00	0.00	0.00	0.00	2025-11-14 13:59:23.519808+09	2025-11-14 13:59:23.519808+09	0.00	0	0.00	0.00
588	9	2024	10	0.00	0.00	0	0.00	0	0.00	0.00	0.00	0.00	0.00	2025-11-14 13:59:23.562942+09	2025-11-14 13:59:23.562942+09	0.00	0	0.00	0.00
589	10	2024	10	0.00	0.00	0	0.00	0	0.00	0.00	0.00	0.00	0.00	2025-11-14 13:59:23.565928+09	2025-11-14 13:59:23.565928+09	0.00	0	0.00	0.00
590	4	2024	10	0.00	0.00	0	0.00	0	0.00	0.00	0.00	0.00	0.00	2025-11-14 13:59:23.568473+09	2025-11-14 13:59:23.568473+09	0.00	0	0.00	0.00
591	8	2024	10	0.00	0.00	0	0.00	0	0.00	0.00	0.00	0.00	0.00	2025-11-14 13:59:23.570789+09	2025-11-14 13:59:23.570789+09	0.00	0	0.00	0.00
592	5	2024	8	0.00	0.00	0	0.00	0	0.00	0.00	0.00	0.00	0.00	2025-11-14 13:59:25.241661+09	2025-11-14 13:59:25.241661+09	0.00	0	0.00	0.00
593	4	2024	8	0.00	0.00	0	0.00	0	0.00	0.00	0.00	0.00	0.00	2025-11-14 13:59:25.260457+09	2025-11-14 13:59:25.260457+09	0.00	0	0.00	0.00
594	9	2024	8	0.00	0.00	0	0.00	0	0.00	0.00	0.00	0.00	0.00	2025-11-14 13:59:25.26293+09	2025-11-14 13:59:25.26293+09	0.00	0	0.00	0.00
547	5	2030	11	0.00	0.00	0	0.00	0	0.00	0.00	0.00	0.00	0.00	2025-11-14 13:58:23.938864+09	2025-11-14 13:58:23.938864+09	0.00	0	0.00	0.00
548	4	2030	11	0.00	0.00	0	0.00	0	0.00	0.00	0.00	0.00	0.00	2025-11-14 13:58:23.982426+09	2025-11-14 13:58:23.982426+09	0.00	0	0.00	0.00
549	9	2030	11	0.00	0.00	0	0.00	0	0.00	0.00	0.00	0.00	0.00	2025-11-14 13:58:23.986052+09	2025-11-14 13:58:23.986052+09	0.00	0	0.00	0.00
550	8	2030	11	0.00	0.00	0	0.00	0	0.00	0.00	0.00	0.00	0.00	2025-11-14 13:58:23.989188+09	2025-11-14 13:58:23.989188+09	0.00	0	0.00	0.00
551	10	2030	11	0.00	0.00	0	0.00	0	0.00	0.00	0.00	0.00	0.00	2025-11-14 13:58:23.991977+09	2025-11-14 13:58:23.991977+09	0.00	0	0.00	0.00
552	5	2030	4	0.00	0.00	0	0.00	0	0.00	0.00	0.00	0.00	0.00	2025-11-14 13:58:35.401939+09	2025-11-14 13:58:35.401939+09	0.00	0	0.00	0.00
553	4	2030	4	0.00	0.00	0	0.00	0	0.00	0.00	0.00	0.00	0.00	2025-11-14 13:58:35.424084+09	2025-11-14 13:58:35.424084+09	0.00	0	0.00	0.00
554	9	2030	4	0.00	0.00	0	0.00	0	0.00	0.00	0.00	0.00	0.00	2025-11-14 13:58:35.427027+09	2025-11-14 13:58:35.427027+09	0.00	0	0.00	0.00
555	8	2030	4	0.00	0.00	0	0.00	0	0.00	0.00	0.00	0.00	0.00	2025-11-14 13:58:35.430453+09	2025-11-14 13:58:35.430453+09	0.00	0	0.00	0.00
556	10	2030	4	0.00	0.00	0	0.00	0	0.00	0.00	0.00	0.00	0.00	2025-11-14 13:58:35.433456+09	2025-11-14 13:58:35.433456+09	0.00	0	0.00	0.00
595	8	2024	8	0.00	0.00	0	0.00	0	0.00	0.00	0.00	0.00	0.00	2025-11-14 13:59:25.265571+09	2025-11-14 13:59:25.265571+09	0.00	0	0.00	0.00
596	10	2024	8	0.00	0.00	0	0.00	0	0.00	0.00	0.00	0.00	0.00	2025-11-14 13:59:25.268359+09	2025-11-14 13:59:25.268359+09	0.00	0	0.00	0.00
181	5	2025	10	0.00	0.00	0	0.00	0	0.00	754.56	0.00	0.00	778.56	2025-11-12 22:47:04.628001+09	2025-11-12 22:49:16.21616+09	24.00	0	0.00	0.00
183	4	2025	10	4.94	6422.00	0	0.00	0	0.00	25.24	0.00	0.00	6447.24	2025-11-12 22:47:04.690195+09	2025-11-12 22:49:16.227824+09	0.00	0	0.00	0.00
184	8	2025	10	0.00	0.00	0	0.00	0	0.00	0.00	0.00	0.00	0.00	2025-11-12 22:47:04.693131+09	2025-11-12 22:49:16.229284+09	0.00	0	0.00	0.00
182	9	2025	10	0.00	0.00	0	0.00	0	0.00	0.00	0.00	0.00	0.00	2025-11-12 22:47:04.650901+09	2025-11-12 22:49:16.231185+09	0.00	0	0.00	0.00
185	10	2025	10	0.00	0.00	0	0.00	0	0.00	0.00	0.00	0.00	0.00	2025-11-12 22:47:04.698103+09	2025-11-12 22:49:16.232776+09	0.00	0	0.00	0.00
582	5	2024	11	0.00	0.00	0	0.00	0	0.00	0.00	0.00	0.00	0.00	2025-11-14 13:59:01.042117+09	2025-11-14 13:59:27.436643+09	0.00	0	0.00	0.00
583	4	2024	11	0.00	0.00	0	0.00	0	0.00	0.00	0.00	0.00	0.00	2025-11-14 13:59:01.066987+09	2025-11-14 13:59:27.494593+09	0.00	0	0.00	0.00
584	9	2024	11	0.00	0.00	0	0.00	0	0.00	0.00	0.00	0.00	0.00	2025-11-14 13:59:01.070677+09	2025-11-14 13:59:27.498511+09	0.00	0	0.00	0.00
585	8	2024	11	0.00	0.00	0	0.00	0	0.00	0.00	0.00	0.00	0.00	2025-11-14 13:59:01.074215+09	2025-11-14 13:59:27.503002+09	0.00	0	0.00	0.00
154	8	2025	11	0.00	0.00	1000	500.00	8000	2400.00	0.00	0.00	0.00	3500.00	2025-11-12 22:40:43.943526+09	2025-11-14 13:59:29.806925+09	0.00	1	600.00	0.00
586	10	2024	11	0.00	0.00	0	0.00	0	0.00	0.00	0.00	0.00	0.00	2025-11-14 13:59:01.078066+09	2025-11-14 13:59:27.513141+09	0.00	0	0.00	0.00
151	5	2025	11	1.20	1440.00	3960	1980.00	0	0.00	64.80	112.00	60.00	11496.80	2025-11-12 22:40:43.818971+09	2025-11-14 13:59:29.78356+09	0.00	3	7960.00	0.00
152	4	2025	11	18.85	24505.00	0	0.00	0	0.00	45.00	0.00	0.00	24595.00	2025-11-12 22:40:43.93275+09	2025-11-14 13:59:29.802037+09	45.00	0	0.00	0.00
153	9	2025	11	0.00	0.00	1000	500.00	2000	600.00	0.00	0.00	0.00	4460.00	2025-11-12 22:40:43.935546+09	2025-11-14 13:59:29.80462+09	0.00	2	3360.00	0.00
156	10	2025	11	0.00	0.00	0	0.00	0	0.00	0.00	0.00	0.00	5400.00	2025-11-12 22:40:43.957824+09	2025-11-14 13:59:29.809042+09	0.00	1	5400.00	0.00
567	5	2021	11	0.00	0.00	0	0.00	0	0.00	0.00	0.00	0.00	0.00	2025-11-14 13:58:49.807856+09	2025-11-14 13:58:49.807856+09	0.00	0	0.00	0.00
568	4	2021	11	0.00	0.00	0	0.00	0	0.00	0.00	0.00	0.00	0.00	2025-11-14 13:58:49.832894+09	2025-11-14 13:58:49.832894+09	0.00	0	0.00	0.00
569	9	2021	11	0.00	0.00	0	0.00	0	0.00	0.00	0.00	0.00	0.00	2025-11-14 13:58:49.836046+09	2025-11-14 13:58:49.836046+09	0.00	0	0.00	0.00
570	8	2021	11	0.00	0.00	0	0.00	0	0.00	0.00	0.00	0.00	0.00	2025-11-14 13:58:49.839646+09	2025-11-14 13:58:49.839646+09	0.00	0	0.00	0.00
571	10	2021	11	0.00	0.00	0	0.00	0	0.00	0.00	0.00	0.00	0.00	2025-11-14 13:58:49.842846+09	2025-11-14 13:58:49.842846+09	0.00	0	0.00	0.00
\.


--
-- Data for Name: salary_attenday; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.salary_attenday (id, category_id, attenday_number, value, other, created_at, updated_at) FROM stdin;
6	2	3	200.00	\N	2025-12-12 22:30:54.458908+09	2025-12-13 07:51:05.840009+09
5	2	5	400.00	\N	2025-12-12 22:30:54.458691+09	2025-12-13 07:51:05.90226+09
4	2	6	400.00	\N	2025-12-12 22:30:54.452412+09	2025-12-13 07:51:05.901866+09
3	2	2	200.00	\N	2025-12-12 22:30:54.451168+09	2025-12-13 07:51:05.837462+09
2	2	1	300.00	\N	2025-12-12 22:30:54.446253+09	2025-12-13 07:51:05.73996+09
7	2	7	400.00	\N	2025-12-12 22:30:54.515146+09	2025-12-13 07:51:05.92641+09
1	2	4	200.00	\N	2025-12-12 22:30:54.445269+09	2025-12-13 07:51:05.902391+09
\.


--
-- Data for Name: salary_category; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.salary_category (id, cast_id, category_id, value, other, created_at, updated_at) FROM stdin;
1	8	3	0.00	\N	2025-12-12 22:31:26.745489+09	2025-12-12 22:31:26.745489+09
2	9	3	0.00	\N	2025-12-12 22:31:26.806874+09	2025-12-12 22:31:26.806874+09
3	10	3	0.00	\N	2025-12-12 22:31:26.808224+09	2025-12-12 22:31:26.808224+09
5	4	3	0.30	\N	2025-12-12 22:31:26.810431+09	2025-12-12 22:34:13.468219+09
4	5	3	0.60	\N	2025-12-12 22:31:26.809317+09	2025-12-12 22:34:25.556089+09
31	1	1	-1.00	\N	2025-12-13 06:57:57.009674+09	2025-12-13 06:57:57.009674+09
32	4	1	-1.00	\N	2025-12-13 06:57:57.009674+09	2025-12-13 06:57:57.009674+09
33	5	1	-1.00	\N	2025-12-13 06:57:57.009674+09	2025-12-13 06:57:57.009674+09
34	8	1	-1.00	\N	2025-12-13 06:57:57.009674+09	2025-12-13 06:57:57.009674+09
35	9	1	-1.00	\N	2025-12-13 06:57:57.009674+09	2025-12-13 06:57:57.009674+09
36	10	1	-1.00	\N	2025-12-13 06:57:57.009674+09	2025-12-13 06:57:57.009674+09
43	1	4	-1.00	\N	2025-12-13 07:52:13.825344+09	2025-12-13 07:52:13.825344+09
44	4	4	-1.00	\N	2025-12-13 07:52:13.825344+09	2025-12-13 07:52:13.825344+09
45	5	4	-1.00	\N	2025-12-13 07:52:13.825344+09	2025-12-13 07:52:13.825344+09
46	8	4	-1.00	\N	2025-12-13 07:52:13.825344+09	2025-12-13 07:52:13.825344+09
47	9	4	-1.00	\N	2025-12-13 07:52:13.825344+09	2025-12-13 07:52:13.825344+09
48	10	4	-1.00	\N	2025-12-13 07:52:13.825344+09	2025-12-13 07:52:13.825344+09
49	1	2	300.00	\N	2025-12-14 20:49:37.601993+09	2025-12-14 20:53:32.98237+09
50	4	2	200.00	\N	2025-12-14 20:49:37.783166+09	2025-12-14 20:53:32.984436+09
\.


--
-- Data for Name: salary_full; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.salary_full (id, category_id, other, created_at, updated_at) FROM stdin;
6	1	\N	2025-12-13 06:57:57.009674+09	2025-12-13 06:57:57.009674+09
8	4	\N	2025-12-13 07:52:13.825344+09	2025-12-13 07:52:13.825344+09
\.


--
-- Data for Name: salesorder; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.salesorder (id, cast_id, product_id, amount, table_id, session_id, unit_price, total_price, status, created_at, updated_at, accepted_at, accepted_by, for_cast) FROM stdin;
43	5	10	2	3	46	323.00	646.00	accepted	2025-10-28 03:09:11.016395+09	2025-10-28 03:09:28.314611+09	2025-10-28 03:09:28.314611+09	1	0
111	\N	10	1	3	183	323.00	323.00	rejected	2025-11-15 16:18:35.663247+09	2025-11-15 16:19:40.340626+09	\N	\N	0
110	8	10	2	3	181	323.00	646.00	accepted	2025-11-15 13:38:18.592129+09	2025-11-15 16:58:02.892823+09	2025-11-15 16:58:02.892823+09	1	1
91	4	3	1	5	80	54.00	54.00	rejected	2025-11-02 00:04:19.032697+09	2025-11-02 03:10:12.741482+09	\N	\N	0
109	8	10	2	3	181	323.00	646.00	accepted	2025-11-15 12:51:19.968492+09	2025-11-15 16:58:02.924985+09	2025-11-15 16:58:02.924985+09	1	1
108	\N	10	1	3	181	323.00	323.00	accepted	2025-11-15 12:51:04.519413+09	2025-11-15 16:58:03.791452+09	2025-11-15 16:58:03.791452+09	1	0
115	\N	10	4	5	190	323.00	1292.00	accepted	2025-11-18 13:46:56.760962+09	2025-11-18 13:47:41.534821+09	2025-11-18 13:47:41.534821+09	1	0
114	\N	9	2	5	190	50.00	100.00	accepted	2025-11-18 13:46:48.605222+09	2025-11-18 13:47:41.545392+09	2025-11-18 13:47:41.545392+09	1	0
92	5	3	1	3	81	54.00	54.00	accepted	2025-11-04 03:03:18.043907+09	2025-11-12 22:48:36.566157+09	2025-11-04 15:33:58.478344+09	1	1
90	4	9	1	5	80	50.00	50.00	accepted	2025-11-01 23:16:21.549581+09	2025-11-12 22:48:38.055693+09	2025-11-01 23:16:41.271084+09	1	1
88	5	10	1	5	79	323.00	323.00	accepted	2025-11-01 22:54:15.856848+09	2025-11-12 22:48:38.722072+09	2025-11-01 22:54:31.614582+09	1	1
87	5	10	1	3	77	323.00	323.00	accepted	2025-11-01 22:53:08.814983+09	2025-11-12 22:48:41.509368+09	2025-11-01 22:53:46.933249+09	1	1
86	\N	3	1	3	76	54.00	54.00	rejected	2025-11-01 20:40:27.734872+09	2025-11-12 22:48:42.698982+09	\N	1	1
85	\N	10	1	3	76	323.00	323.00	rejected	2025-11-01 20:40:24.980409+09	2025-11-12 22:48:43.133826+09	\N	1	1
84	4	10	1	4	75	323.00	323.00	accepted	2025-11-01 19:21:55.408893+09	2025-11-12 22:48:43.42275+09	2025-11-01 20:37:59.074343+09	1	1
83	4	10	2	4	74	323.00	646.00	accepted	2025-11-01 16:13:40.952087+09	2025-11-12 22:48:43.760965+09	2025-11-01 16:13:45.462165+09	1	1
82	5	3	2	4	74	54.00	108.00	accepted	2025-11-01 16:13:11.191052+09	2025-11-12 22:48:44.038153+09	2025-11-01 16:13:17.117512+09	1	1
81	4	2	1	4	74	150.00	150.00	accepted	2025-11-01 15:49:57.465469+09	2025-11-12 22:48:44.371387+09	2025-11-01 16:06:14.502928+09	1	1
80	5	10	1	4	74	323.00	323.00	accepted	2025-11-01 15:49:40.20467+09	2025-11-12 22:48:44.639775+09	2025-11-01 16:06:14.448818+09	1	1
79	5	1	1	4	71	300.00	300.00	accepted	2025-10-31 10:00:39.8564+09	2025-11-12 22:48:44.910137+09	2025-10-31 10:00:48.934812+09	1	1
78	5	1	1	4	71	300.00	300.00	rejected	2025-10-31 09:59:50.875524+09	2025-11-12 22:48:45.175053+09	\N	1	1
77	5	1	4	4	71	300.00	1200.00	rejected	2025-10-31 09:55:16.787117+09	2025-11-12 22:48:45.43941+09	\N	1	1
76	5	10	1	4	71	323.00	323.00	accepted	2025-10-31 09:52:41.178138+09	2025-11-12 22:48:45.728279+09	2025-10-31 09:53:29.203142+09	1	1
75	5	10	2	1	70	323.00	646.00	accepted	2025-10-30 19:15:12.871411+09	2025-11-12 22:48:45.995162+09	2025-10-30 19:16:45.165779+09	1	1
74	4	3	3	1	69	54.00	162.00	accepted	2025-10-30 14:51:58.776746+09	2025-11-12 22:48:46.274159+09	2025-10-30 14:53:56.435982+09	1	1
73	4	3	3	1	69	54.00	162.00	accepted	2025-10-30 14:51:58.32619+09	2025-11-12 22:48:46.538868+09	2025-10-30 14:53:56.505496+09	1	1
72	4	2	2	1	69	150.00	300.00	accepted	2025-10-30 14:51:46.396123+09	2025-11-12 22:48:46.883861+09	2025-10-30 14:53:57.395352+09	1	1
70	4	10	2	4	65	323.00	646.00	accepted	2025-10-28 12:49:26.267629+09	2025-11-12 22:48:47.358109+09	2025-10-28 12:49:33.488996+09	1	1
69	4	10	1	4	65	323.00	323.00	accepted	2025-10-28 12:48:58.890485+09	2025-11-12 22:48:47.589469+09	2025-10-28 12:49:03.025896+09	1	1
68	5	2	1	4	65	150.00	150.00	accepted	2025-10-28 12:45:23.617656+09	2025-11-12 22:48:47.839055+09	2025-10-28 12:48:45.796951+09	1	1
71	4	1	2	3	68	300.00	600.00	accepted	2025-10-29 16:09:14.822194+09	2025-10-29 16:09:30.653927+09	2025-10-29 16:09:30.653927+09	1	0
67	5	2	1	4	65	150.00	150.00	accepted	2025-10-28 12:45:12.171325+09	2025-11-12 22:48:48.124284+09	2025-10-28 12:48:45.87911+09	1	1
66	4	10	1	4	65	323.00	323.00	accepted	2025-10-28 12:45:04.898375+09	2025-11-12 22:48:48.405877+09	2025-10-28 12:48:47.969302+09	1	1
65	5	10	1	4	64	323.00	323.00	accepted	2025-10-28 12:43:09.067795+09	2025-11-12 22:48:48.646625+09	2025-10-28 12:43:29.713142+09	1	1
64	4	10	1	4	64	323.00	323.00	accepted	2025-10-28 12:34:36.553096+09	2025-11-12 22:48:48.877587+09	2025-10-28 12:34:50.93608+09	1	1
63	4	10	1	4	64	323.00	323.00	accepted	2025-10-28 12:34:00.751227+09	2025-11-12 22:48:49.131944+09	2025-10-28 12:34:04.34543+09	1	1
62	5	3	1	4	64	54.00	54.00	accepted	2025-10-28 12:17:36.723238+09	2025-11-12 22:48:49.422426+09	2025-10-28 12:18:05.161228+09	1	1
61	5	10	1	4	64	323.00	323.00	accepted	2025-10-28 12:13:05.541313+09	2025-11-12 22:48:49.628486+09	2025-10-28 12:13:10.915011+09	1	1
60	4	10	1	5	63	323.00	323.00	accepted	2025-10-28 12:10:58.715872+09	2025-11-12 22:48:49.910427+09	2025-10-28 12:11:21.982317+09	1	1
59	5	10	1	5	63	323.00	323.00	accepted	2025-10-28 12:04:55.484121+09	2025-11-12 22:48:50.133782+09	2025-10-28 12:05:21.419173+09	1	1
58	5	10	1	5	63	323.00	323.00	accepted	2025-10-28 11:58:12.606962+09	2025-11-12 22:48:50.408019+09	2025-10-28 11:58:19.119306+09	1	1
57	5	1	1	5	62	300.00	300.00	accepted	2025-10-28 11:56:36.797554+09	2025-11-12 22:48:50.640582+09	2025-10-28 11:57:03.456501+09	1	1
56	5	2	1	5	62	150.00	150.00	accepted	2025-10-28 11:53:13.639459+09	2025-11-12 22:48:50.896998+09	2025-10-28 11:53:24.02875+09	1	1
55	5	1	1	5	62	300.00	300.00	accepted	2025-10-28 11:45:04.078594+09	2025-11-12 22:48:51.172383+09	2025-10-28 11:45:38.789799+09	1	1
54	5	10	1	5	62	323.00	323.00	accepted	2025-10-28 11:44:28.445184+09	2025-11-12 22:48:51.423682+09	2025-10-28 11:45:39.305391+09	1	1
53	5	9	1	5	62	50.00	50.00	accepted	2025-10-28 11:39:46.069163+09	2025-11-12 22:48:51.680889+09	2025-10-28 11:39:51.846486+09	1	1
52	5	10	1	5	62	323.00	323.00	accepted	2025-10-28 11:35:02.568118+09	2025-11-12 22:48:51.939243+09	2025-10-28 11:35:09.934702+09	1	1
51	5	3	1	5	57	54.00	54.00	accepted	2025-10-28 09:38:14.459647+09	2025-11-12 22:48:53.112754+09	2025-10-28 10:50:19.447313+09	1	1
50	5	9	1	5	57	50.00	50.00	accepted	2025-10-28 09:37:51.863058+09	2025-11-12 22:48:53.373183+09	2025-10-28 10:50:19.369673+09	1	1
49	4	1	2	3	51	300.00	600.00	rejected	2025-10-28 03:37:15.177939+09	2025-11-12 22:48:53.616484+09	\N	1	1
48	4	2	1	3	51	150.00	150.00	accepted	2025-10-28 03:35:13.637581+09	2025-11-12 22:48:53.905828+09	2025-10-28 03:35:52.412904+09	1	1
47	5	1	3	3	51	300.00	900.00	accepted	2025-10-28 03:32:27.324032+09	2025-11-12 22:48:54.15413+09	2025-10-28 03:35:54.307884+09	1	1
46	5	9	1	2	49	50.00	50.00	accepted	2025-10-28 03:21:55.907336+09	2025-11-12 22:48:54.42442+09	2025-10-28 03:22:03.500728+09	1	1
45	5	10	2	2	49	323.00	646.00	accepted	2025-10-28 03:21:49.541485+09	2025-11-12 22:48:54.712992+09	2025-10-28 03:22:02.946555+09	1	1
44	5	9	1	3	46	50.00	50.00	accepted	2025-10-28 03:09:18.973205+09	2025-11-12 22:48:55.013007+09	2025-10-28 03:09:28.17045+09	1	1
42	4	3	1	3	45	54.00	54.00	rejected	2025-10-28 03:00:41.828203+09	2025-11-12 22:48:56.238812+09	\N	1	1
41	4	2	2	3	45	150.00	300.00	accepted	2025-10-28 02:57:03.723875+09	2025-11-12 22:48:56.891142+09	2025-10-28 02:57:35.090922+09	1	1
40	4	10	1	3	45	323.00	323.00	accepted	2025-10-28 02:56:56.811776+09	2025-11-12 22:49:00.279897+09	2025-10-28 02:57:35.163057+09	1	1
113	8	10	2	1	184	323.00	646.00	accepted	2025-11-15 17:50:22.920559+09	2025-11-18 13:47:41.697731+09	2025-11-18 13:47:41.697731+09	1	1
112	\N	9	1	1	184	50.00	50.00	accepted	2025-11-15 17:50:12.909424+09	2025-11-18 13:47:41.755275+09	2025-11-18 13:47:41.755275+09	1	0
101	5	9	6	3	149	50.00	300.00	accepted	2025-11-13 02:59:55.248791+09	2025-11-13 03:01:01.722504+09	2025-11-13 03:01:01.722504+09	1	1
99	10	3	5	3	149	54.00	270.00	accepted	2025-11-13 02:59:38.093155+09	2025-11-13 03:01:01.789793+09	2025-11-13 03:01:01.789793+09	1	1
100	5	3	5	3	149	54.00	270.00	accepted	2025-11-13 02:59:48.049372+09	2025-11-13 03:01:01.790345+09	2025-11-13 03:01:01.790345+09	1	1
98	4	9	2	3	149	50.00	100.00	accepted	2025-11-13 02:59:24.703589+09	2025-11-13 03:01:02.031067+09	2025-11-13 03:01:02.031067+09	1	1
96	8	10	3	3	149	323.00	969.00	accepted	2025-11-13 02:59:07.691217+09	2025-11-13 03:01:02.037833+09	2025-11-13 03:01:02.037833+09	1	1
97	\N	1	1	3	149	300.00	300.00	accepted	2025-11-13 02:59:13.358022+09	2025-11-13 03:01:02.040262+09	2025-11-13 03:01:02.040262+09	1	0
102	8	3	1	4	151	54.00	54.00	accepted	2025-11-13 10:12:14.001321+09	2025-11-13 10:12:33.192315+09	2025-11-13 10:12:33.192315+09	1	1
103	\N	9	1	3	160	50.00	50.00	accepted	2025-11-13 16:48:05.032458+09	2025-11-13 16:58:15.414185+09	2025-11-13 16:58:15.414185+09	1	0
104	\N	10	1	3	160	323.00	323.00	accepted	2025-11-13 16:48:08.046492+09	2025-11-13 16:58:15.38257+09	2025-11-13 16:58:15.38257+09	1	0
105	\N	1	1	3	160	300.00	300.00	accepted	2025-11-13 16:58:32.381832+09	2025-11-13 23:54:48.083309+09	2025-11-13 23:54:48.083309+09	1	0
106	\N	1	1	4	178	300.00	300.00	accepted	2025-11-14 14:36:56.615656+09	2025-11-14 14:37:32.945868+09	2025-11-14 14:37:32.945868+09	1	0
116	\N	10	1	4	200	323.00	323.00	accepted	2025-11-18 15:19:49.535178+09	2025-11-18 16:01:47.335956+09	2025-11-18 16:01:47.335956+09	1	0
117	\N	9	2	4	202	50.00	100.00	accepted	2025-11-18 16:00:00.04076+09	2025-11-18 16:01:47.328821+09	2025-11-18 16:01:47.328821+09	1	0
126	\N	3	2	3	235	54.00	108.00	rejected	2025-11-18 17:35:35.118639+09	2025-11-18 17:36:20.340447+09	\N	\N	0
124	\N	9	1	3	235	50.00	50.00	rejected	2025-11-18 17:35:23.405621+09	2025-11-18 17:36:20.36157+09	\N	\N	0
127	5	9	2	3	238	50.00	100.00	rejected	2025-11-18 17:44:30.092645+09	2025-11-18 17:44:56.034226+09	\N	\N	1
121	\N	10	1	3	215	323.00	323.00	accepted	2025-11-18 16:46:28.065788+09	2025-11-18 17:47:53.953996+09	2025-11-18 17:47:53.953996+09	1	0
122	\N	10	1	3	220	323.00	323.00	accepted	2025-11-18 17:01:54.961449+09	2025-11-18 17:47:53.964867+09	2025-11-18 17:47:53.964867+09	1	0
120	8	10	2	3	215	323.00	646.00	accepted	2025-11-18 16:45:09.065096+09	2025-11-18 17:47:54.897537+09	2025-11-18 17:47:54.897537+09	1	1
119	\N	9	2	3	214	50.00	100.00	accepted	2025-11-18 16:43:05.390407+09	2025-11-18 17:47:55.435064+09	2025-11-18 17:47:55.435064+09	1	0
118	\N	9	1	4	203	50.00	50.00	accepted	2025-11-18 16:02:38.791824+09	2025-11-18 17:47:56.642123+09	2025-11-18 17:47:56.642123+09	1	0
129	5	10	2	4	241	323.00	646.00	accepted	2025-11-18 20:40:42.337996+09	2025-11-18 21:15:05.54419+09	2025-11-18 21:15:05.54419+09	1	1
128	4	9	1	4	241	50.00	50.00	accepted	2025-11-18 20:38:23.611697+09	2025-11-18 21:15:06.138064+09	2025-11-18 21:15:06.138064+09	1	1
130	8	9	2	1	246	50.00	100.00	accepted	2025-11-18 21:43:06.852561+09	2025-11-18 21:54:07.811434+09	2025-11-18 21:54:07.811434+09	1	1
131	\N	9	2	1	253	50.00	100.00	accepted	2025-11-19 00:40:52.003282+09	2025-11-19 00:53:51.252439+09	2025-11-19 00:53:51.252439+09	1	1
132	\N	10	1	1	260	323.00	323.00	pending	2025-11-19 01:57:32.797122+09	2025-11-19 01:57:32.797122+09	\N	\N	0
133	\N	1	1	1	260	300.00	300.00	pending	2025-11-19 01:57:53.275586+09	2025-11-19 01:57:53.275586+09	\N	\N	0
\.


--
-- Data for Name: serviceorder; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.serviceorder (id, cast_id, service_id, amount, table_id, session_id, status, created_at, updated_at, accepted_by, accepted_at) FROM stdin;
4	5	7	1	5	62	accepted	2025-10-28 11:35:42.674076+09	2025-10-28 11:35:48.511047+09	1	2025-10-28 11:35:48.511047+09
5	5	7	1	4	64	accepted	2025-10-28 12:35:15.558091+09	2025-10-28 12:35:44.045412+09	1	2025-10-28 12:35:44.045412+09
6	4	6	1	4	64	accepted	2025-10-28 12:43:47.93422+09	2025-10-28 12:44:00.936209+09	1	2025-10-28 12:44:00.936209+09
7	5	6	1	4	65	accepted	2025-10-28 12:49:09.942981+09	2025-10-28 12:49:13.683681+09	1	2025-10-28 12:49:13.683681+09
8	5	6	1	2	88	accepted	2025-11-11 17:24:18.798405+09	2025-11-11 17:25:12.284231+09	1	2025-11-11 17:25:12.284231+09
9	8	6	1	4	151	accepted	2025-11-13 10:39:56.075349+09	2025-11-13 10:40:07.665208+09	1	2025-11-13 10:40:07.665208+09
10	5	6	2	4	151	accepted	2025-11-13 10:45:54.083739+09	2025-11-13 10:46:07.47966+09	1	2025-11-13 10:46:07.47966+09
11	9	5	2	4	151	accepted	2025-11-13 10:49:15.128485+09	2025-11-13 10:51:08.796537+09	1	2025-11-13 10:51:08.796537+09
12	8	5	2	3	160	accepted	2025-11-13 15:51:51.424431+09	2025-11-13 16:45:59.448671+09	1	2025-11-13 16:45:59.448671+09
13	5	5	1	3	160	accepted	2025-11-13 16:48:32.745803+09	2025-11-13 16:58:18.705007+09	1	2025-11-13 16:58:18.705007+09
14	8	6	1	3	160	accepted	2025-11-13 16:48:36.045264+09	2025-11-13 16:58:18.708221+09	1	2025-11-13 16:58:18.708221+09
15	\N	6	1	3	160	accepted	2025-11-13 16:58:35.443291+09	2025-11-13 23:55:09.347099+09	1	2025-11-13 23:55:09.347099+09
17	5	5	1	3	183	accepted	2025-11-15 16:18:46.548567+09	2025-11-15 16:58:07.234502+09	1	2025-11-15 16:58:07.234502+09
16	5	5	1	3	181	accepted	2025-11-15 14:33:24.417673+09	2025-11-15 16:58:07.243121+09	1	2025-11-15 16:58:07.243121+09
18	\N	5	2	5	190	accepted	2025-11-18 13:47:06.00338+09	2025-11-18 13:47:48.611664+09	1	2025-11-18 13:47:48.611664+09
19	9	5	1	4	202	accepted	2025-11-18 16:00:03.39847+09	2025-11-18 16:01:52.13036+09	1	2025-11-18 16:01:52.13036+09
24	4	5	1	3	238	accepted	2025-11-18 17:44:11.095638+09	2025-11-18 17:48:03.585883+09	1	2025-11-18 17:48:03.585883+09
23	8	8	1	3	235	accepted	2025-11-18 17:35:14.997521+09	2025-11-18 17:48:03.587576+09	1	2025-11-18 17:48:03.587576+09
22	5	5	1	3	234	accepted	2025-11-18 17:33:26.217719+09	2025-11-18 17:48:03.601676+09	1	2025-11-18 17:48:03.601676+09
21	5	7	1	3	215	accepted	2025-11-18 16:46:17.589084+09	2025-11-18 17:48:04.493736+09	1	2025-11-18 17:48:04.493736+09
20	\N	8	1	3	215	accepted	2025-11-18 16:45:22.840753+09	2025-11-18 17:48:05.140599+09	1	2025-11-18 17:48:05.140599+09
25	5	8	1	4	248	accepted	2025-11-18 22:15:01.562404+09	2025-11-18 22:36:53.352233+09	1	2025-11-18 22:36:53.352233+09
26	5	7	1	1	260	pending	2025-11-19 01:57:57.072152+09	2025-11-19 01:57:57.072152+09	\N	\N
\.


--
-- Data for Name: services; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.services (id, name, other, created_at, updated_at) FROM stdin;
7	箸	\N	2025-10-26 10:28:17.306886+09	2025-11-04 02:44:22.38427+09
6	グラス	\N	2025-10-26 10:27:28.863205+09	2025-11-04 02:44:37.005057+09
5	灰皿交換	\N	2025-10-26 10:27:23.391463+09	2025-11-04 02:45:04.09022+09
8	おしぼり	\N	2025-11-04 02:45:13.509881+09	2025-11-04 02:45:13.509881+09
\.


--
-- Data for Name: sessions; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.sessions (id, table_id, cost, end_at, created_at, updated_at, set_count, client, status, set_extensions, is_paused, paused_at, paused_elapsed) FROM stdin;
60	5	0.00	\N	2025-10-28 10:49:40.237976+09	2025-10-30 10:34:09.018724+09	1	0	0	[]	f	\N	0
58	5	100.00	\N	2025-10-28 09:44:59.246084+09	2025-10-30 10:57:19.957434+09	1	0	0	[]	f	\N	0
57	5	200.00	\N	2025-10-28 09:33:21.175212+09	2025-10-30 10:57:25.855469+09	1	0	0	[]	f	\N	0
59	5	200.00	\N	2025-10-28 09:53:23.137994+09	2025-10-30 10:57:31.696766+09	1	0	0	[]	f	\N	0
53	5	300.00	\N	2025-10-28 08:48:49.838576+09	2025-10-30 10:57:38.99038+09	1	0	0	[]	f	\N	0
89	2	0.00	2025-11-11 19:03:56.866+09	2025-11-11 19:03:54.022929+09	2025-11-11 19:03:57.015533+09	1	0	0	[]	f	\N	0
143	3	164868.00	2025-11-13 00:40:44.2+09	2025-11-12 23:16:39.118466+09	2025-11-13 00:40:45.625816+09	5	5	0	[]	f	\N	0
69	1	624.00	2025-10-30 19:13:46.062+09	2025-10-30 14:51:32.436315+09	2025-10-31 00:10:44.407645+09	1	0	0	[]	f	\N	0
70	1	646.00	2025-10-29 00:11:18+09	2025-10-30 19:14:59.805827+09	2025-10-31 00:11:29.725886+09	1	0	0	[]	f	\N	0
165	3	33000.00	2025-11-14 01:31:36.731+09	2025-11-14 01:20:45.705219+09	2025-11-14 01:31:37.176043+09	1	6	0	[]	f	\N	0
90	2	0.00	2025-11-11 20:26:52.571+09	2025-11-11 20:26:38.422958+09	2025-11-11 20:26:53.197238+09	1	0	0	[]	f	\N	0
145	3	55000.00	2025-11-13 00:58:28.112+09	2025-11-13 00:57:47.657493+09	2025-11-13 00:58:28.178192+09	2	5	0	[]	f	\N	0
147	3	35904.00	2025-11-13 02:44:56.629+09	2025-11-13 02:44:10.615034+09	2025-11-13 02:44:58.132109+09	1	5	0	[]	f	\N	0
74	4	473.00	2025-11-01 18:11:42.433+09	2025-11-01 15:49:33.620155+09	2025-11-01 18:11:42.498493+09	1	0	0	[]	f	\N	0
91	2	0.00	2025-11-11 20:55:15.02+09	2025-11-11 20:27:03.111576+09	2025-11-11 20:55:15.090997+09	1	0	0	[]	f	\N	0
149	3	29930.00	2025-11-13 03:01:07.946+09	2025-11-13 02:58:55.415447+09	2025-11-13 03:01:10.638656+09	1	5	0	[]	f	\N	0
155	3	49500.00	2025-11-13 11:21:26.679+09	2025-11-13 11:02:43.023505+09	2025-11-13 11:21:28.772766+09	1	9	0	[]	f	\N	0
157	3	79200.00	2025-11-13 13:46:45.381+09	2025-11-13 11:40:29.541382+09	2025-11-13 13:46:47.181583+09	2	9	0	[]	f	\N	0
153	3	0.00	\N	2025-11-13 11:02:00.173528+09	2025-11-13 15:10:05.174246+09	1	5	0	[]	f	\N	0
80	5	373.00	2025-11-03 11:43:40.051+09	2025-11-01 23:11:31.182438+09	2025-11-03 11:43:41.276233+09	1	0	0	[]	f	\N	0
82	3	0.00	2025-11-10 15:12:46.566+09	2025-11-10 15:12:09.212572+09	2025-11-10 15:12:46.599411+09	1	0	0	[]	f	\N	0
83	3	0.00	2025-11-10 17:30:10.709+09	2025-11-10 15:19:41.465224+09	2025-11-10 17:30:11.306684+09	1	0	0	[]	f	\N	0
167	3	544500.00	2025-11-14 01:51:07.601+09	2025-11-14 01:50:14.780389+09	2025-11-14 01:51:07.747736+09	1	99	0	[]	f	\N	0
181	3	34100.00	2025-11-15 16:05:36.45+09	2025-11-15 01:17:25.507412+09	2025-11-15 16:05:39.43372+09	10	2	0	[]	f	\N	0
84	3	0.00	\N	2025-11-10 17:30:26.913463+09	2025-11-11 09:54:54.138729+09	1	0	0	[]	f	\N	0
61	5	0.00	\N	2025-10-28 11:03:22.85636+09	2025-10-28 11:09:21.040487+09	1	0	0	[]	f	\N	0
81	4	0.00	\N	2025-11-03 11:44:00.436476+09	2025-11-11 09:54:56.652348+09	1	0	0	[]	f	\N	0
62	5	0.00	\N	2025-10-28 11:13:45.162346+09	2025-10-28 11:34:51.375395+09	1	0	0	[]	f	\N	0
79	5	0.00	\N	2025-11-01 22:54:07.353563+09	2025-11-11 09:55:10.139405+09	1	0	0	[]	f	\N	0
63	5	0.00	\N	2025-10-28 11:57:48.069863+09	2025-10-28 12:12:07.493495+09	1	0	0	[]	f	\N	0
78	3	0.00	\N	2025-11-01 22:53:37.068562+09	2025-11-11 09:55:12.820425+09	1	0	0	[]	f	\N	0
64	4	0.00	\N	2025-10-28 12:12:59.344118+09	2025-10-28 12:44:16.564247+09	1	0	0	[]	f	\N	0
76	3	0.00	\N	2025-11-01 20:40:13.799576+09	2025-11-11 09:55:15.106321+09	1	0	0	[]	f	\N	0
65	4	1592.00	2025-10-28 12:53:01.477+09	2025-10-28 12:44:21.703502+09	2025-10-28 12:53:01.52372+09	1	0	0	[]	f	\N	0
71	4	646.00	2025-10-31 10:28:21.279+09	2025-10-31 09:51:50.316365+09	2025-11-11 09:55:20.355057+09	1	0	0	[]	f	\N	0
66	4	0.00	2025-10-28 13:37:59.376+09	2025-10-28 13:37:46.757982+09	2025-10-28 13:37:59.410652+09	1	0	0	[]	f	\N	0
72	3	0.00	\N	2025-11-01 15:35:55.926177+09	2025-11-11 09:55:24.090189+09	1	0	0	[]	f	\N	0
73	3	0.00	\N	2025-11-01 15:35:55.914543+09	2025-11-11 09:55:26.092982+09	1	0	0	[]	f	\N	0
75	4	323.00	\N	2025-11-01 19:20:37.434928+09	2025-11-11 09:55:27.719772+09	1	0	0	[]	f	\N	0
68	3	600.00	2025-10-29 16:10:47.988+09	2025-10-29 16:09:00.151829+09	2025-10-29 16:10:48.061389+09	1	0	0	[]	f	\N	0
67	4	0.00	\N	2025-10-28 13:41:16.016656+09	2025-10-30 10:33:48.894458+09	1	0	0	[]	f	\N	0
55	5	0.00	\N	2025-10-28 09:23:03.461708+09	2025-10-30 10:33:53.833982+09	1	0	0	[]	f	\N	0
52	5	0.00	\N	2025-10-28 04:48:29.850117+09	2025-10-30 10:33:54.610324+09	1	0	0	[]	f	\N	0
92	2	0.00	2025-11-11 21:12:31.7+09	2025-11-11 20:55:16.26175+09	2025-11-11 21:12:34.657475+09	1	0	0	[]	f	\N	0
93	2	0.00	2025-11-11 21:12:58.052+09	2025-11-11 21:12:39.226986+09	2025-11-11 21:12:58.315118+09	2	0	0	[]	f	\N	0
50	2	0.00	\N	2025-10-28 03:30:33.823161+09	2025-10-30 10:34:03.457471+09	1	0	0	[]	f	\N	0
51	3	0.00	\N	2025-10-28 03:32:00.582086+09	2025-10-30 10:34:04.444976+09	1	0	0	[]	f	\N	0
54	5	0.00	\N	2025-10-28 09:20:52.777131+09	2025-10-30 10:34:05.368277+09	1	0	0	[]	f	\N	0
56	5	0.00	\N	2025-10-28 09:28:27.098394+09	2025-10-30 10:34:05.982481+09	1	0	0	[]	f	\N	0
77	3	0.00	\N	2025-11-01 20:41:23.821962+09	2025-11-11 09:55:33.835614+09	1	0	0	[]	f	\N	0
49	2	0.00	\N	2025-10-28 03:21:39.860182+09	2025-11-11 09:55:45.806045+09	1	0	0	[]	f	\N	0
48	3	0.00	\N	2025-10-28 03:20:44.906902+09	2025-11-11 09:55:47.175472+09	1	0	0	[]	f	\N	0
47	3	0.00	\N	2025-10-28 03:20:39.610506+09	2025-11-11 09:55:48.140308+09	1	0	0	[]	f	\N	0
46	3	0.00	\N	2025-10-28 03:09:01.367432+09	2025-11-11 09:55:49.151809+09	1	0	0	[]	f	\N	0
45	3	0.00	\N	2025-10-28 02:56:48.207875+09	2025-11-11 09:55:50.251094+09	1	0	0	[]	f	\N	0
94	2	0.00	2025-11-11 23:52:37.105+09	2025-11-11 21:13:45.63144+09	2025-11-11 23:52:38.280787+09	2	0	0	[]	f	\N	0
85	3	0.00	2025-11-11 10:03:51.128+09	2025-11-10 17:30:26.81963+09	2025-11-11 10:03:51.164248+09	1	0	0	[]	f	\N	0
86	2	0.00	2025-11-11 16:18:49.505+09	2025-11-11 10:03:57.970694+09	2025-11-11 16:18:50.790893+09	1	0	0	[]	f	\N	0
87	2	0.00	2025-11-11 17:23:03.314+09	2025-11-11 16:18:52.084887+09	2025-11-11 17:23:03.599845+09	1	0	0	[]	f	\N	0
88	2	0.00	2025-11-11 19:03:50.994+09	2025-11-11 17:23:20.79937+09	2025-11-11 19:03:52.355166+09	1	0	0	[]	f	\N	0
95	2	0.00	2025-11-11 23:57:36.355+09	2025-11-11 23:52:39.862034+09	2025-11-11 23:57:36.498959+09	4	0	0	[]	f	\N	0
96	2	0.00	2025-11-12 00:03:54.019+09	2025-11-11 23:57:37.924856+09	2025-11-12 00:03:54.204898+09	2	0	0	[]	f	\N	0
183	3	17327.00	2025-11-15 16:57:16.256+09	2025-11-15 16:05:59.565606+09	2025-11-15 16:57:20.160719+09	1	2	0	[]	f	\N	0
163	4	13443100.00	2025-11-13 23:53:22.866+09	2025-11-13 23:50:09.585067+09	2025-11-13 23:53:23.434538+09	1	2222	0	[]	f	\N	0
169	3	544500.00	2025-11-14 01:52:09.689+09	2025-11-14 01:51:39.970137+09	2025-11-14 01:52:10.164437+09	1	99	0	[]	f	\N	0
175	1	36300.00	2025-11-14 02:20:57.438+09	2025-11-14 02:19:53.315244+09	2025-11-14 02:20:57.908257+09	1	6	0	[]	f	\N	0
161	3	112200.00	2025-11-14 12:12:28+09	2025-11-13 17:34:32.43673+09	2025-11-14 12:12:31.302486+09	3	6	0	[]	f	\N	0
171	4	440000.00	2025-11-14 01:53:16.673+09	2025-11-14 01:53:11.598714+09	2025-11-14 01:53:16.99597+09	1	80	0	[]	f	\N	0
159	4	0.00	2025-11-18 13:43:34.319+09	2025-11-13 15:40:15.583251+09	2025-11-18 13:43:35.157686+09	1	5	0	[]	f	\N	0
179	3	12100.00	2025-11-15 00:56:38.686+09	2025-11-14 23:31:47.13219+09	2025-11-15 00:56:41.322347+09	2	2	0	[]	f	\N	0
173	1	36300.00	2025-11-14 02:18:39.415+09	2025-11-14 02:02:06.012871+09	2025-11-14 02:18:41.800222+09	1	6	0	[]	f	\N	0
177	3	1233455.00	2025-11-14 12:26:23.894+09	2025-11-14 12:12:42.493247+09	2025-11-14 12:26:23.977644+09	1	2	0	[]	f	\N	0
184	1	0.00	2025-11-15 17:50:39.564+09	2025-11-15 16:57:23.885981+09	2025-11-15 17:50:40.854291+09	1	2	0	[]	f	\N	0
187	5	0.00	2025-11-18 13:45:49.542+09	2025-11-18 12:15:19.935004+09	2025-11-18 13:45:49.619548+09	1	2	0	[]	f	\N	0
186	1	0.00	2025-11-18 12:15:14.355+09	2025-11-15 18:20:10.805617+09	2025-11-18 12:15:18.475627+09	1	2	0	[]	f	\N	0
193	2	0.00	2025-11-18 14:11:06.083+09	2025-11-18 14:02:30.088373+09	2025-11-18 14:11:06.429857+09	1	3	0	[]	f	\N	0
151	4	29759.00	2025-11-18 13:43:44.039+09	2025-11-13 10:10:35.537929+09	2025-11-18 13:43:44.256101+09	1	5	0	[]	f	\N	0
189	5	0.00	2025-11-18 13:46:39.978+09	2025-11-18 13:36:04.925804+09	2025-11-18 13:46:40.967632+09	1	2	0	[]	f	\N	0
194	2	0.00	2025-11-18 14:10:55.364+09	2025-11-18 14:02:38.017057+09	2025-11-18 14:10:56.544317+09	1	3	0	[]	f	\N	0
196	5	0.00	2025-11-18 16:40:16.291+09	2025-11-18 14:11:35.548519+09	2025-11-18 16:40:16.465015+09	1	6	0	[]	f	\N	0
191	4	0.00	2025-11-18 14:23:30.77+09	2025-11-18 13:57:32.957206+09	2025-11-18 14:23:30.828408+09	1	2	0	[]	f	\N	0
199	4	0.00	2025-11-18 15:20:17.527+09	2025-11-18 15:18:11.134103+09	2025-11-18 15:20:17.731164+09	1	2	0	[]	f	\N	0
201	4	0.00	2025-11-18 15:30:32.239+09	2025-11-18 15:20:21.583346+09	2025-11-18 15:30:33.082499+09	1	2	0	[]	f	\N	0
203	4	0.00	2025-11-18 16:03:06.609+09	2025-11-18 16:02:21.047892+09	2025-11-18 16:03:06.766017+09	1	5	0	[]	f	\N	0
205	4	0.00	2025-11-18 16:22:07.93+09	2025-11-18 16:21:56.710894+09	2025-11-18 16:22:07.985819+09	1	5	0	[]	f	\N	0
207	4	0.00	2025-11-18 16:34:03.498+09	2025-11-18 16:27:31.605899+09	2025-11-18 16:34:05.008002+09	1	5	0	[]	f	\N	0
209	4	0.00	2025-11-18 16:34:36.668+09	2025-11-18 16:34:22.023555+09	2025-11-18 16:34:37.302239+09	1	5	0	[]	f	\N	0
144	3	55000.00	2025-11-13 00:57:37.704+09	2025-11-13 00:40:47.212967+09	2025-11-13 00:57:37.775644+09	2	5	0	[]	f	\N	0
141	3	27500.00	2025-11-12 13:47:06.081+09	2025-11-12 13:41:41.422945+09	2025-11-12 13:47:06.477779+09	1	5	0	[]	f	\N	0
142	3	39494.00	2025-11-12 13:49:03.025+09	2025-11-12 13:47:21.155331+09	2025-11-12 13:49:03.051325+09	1	5	0	[]	f	\N	0
146	3	82500.00	2025-11-13 02:08:17.059+09	2025-11-13 00:58:34.784857+09	2025-11-13 02:08:18.948045+09	3	5	0	[]	f	\N	0
150	3	29930.00	2025-11-13 03:01:16.268+09	2025-11-13 03:01:14.019535+09	2025-11-13 03:01:18.062852+09	1	5	0	[]	f	\N	0
156	3	49500.00	2025-11-13 11:40:24.887+09	2025-11-13 11:21:32.142862+09	2025-11-13 11:40:26.729711+09	1	9	0	[]	f	\N	0
208	4	0.00	2025-11-18 16:35:09.562+09	2025-11-18 16:34:21.958581+09	2025-11-18 16:35:10.994182+09	1	5	0	[]	f	\N	0
180	3	12100.00	2025-11-15 01:07:14.823+09	2025-11-15 00:56:43.02458+09	2025-11-15 01:07:18.210878+09	1	2	0	[]	f	\N	0
148	3	0.00	\N	2025-11-13 02:58:55.334615+09	2025-11-13 15:09:57.258279+09	1	5	0	[]	f	\N	0
154	3	0.00	\N	2025-11-13 11:02:08.795455+09	2025-11-13 15:10:09.501305+09	1	5	0	[]	f	\N	0
158	3	126500.00	2025-11-13 15:45:50.148+09	2025-11-13 13:46:54.496813+09	2025-11-13 15:45:51.30943+09	4	6	0	[]	f	\N	0
219	3	0.00	2025-11-18 17:01:36.819+09	2025-11-18 17:01:29.376714+09	2025-11-18 17:01:38.139698+09	1	2	0	[]	f	\N	0
182	3	0.00	2025-11-15 16:05:52.63+09	2025-11-15 16:05:42.127971+09	2025-11-15 16:05:56.190035+09	1	2	0	[]	f	\N	0
160	3	100510.00	2025-11-13 17:34:17.419+09	2025-11-13 15:45:52.641534+09	2025-11-13 17:34:20.612463+09	3	6	0	[]	f	\N	0
210	4	0.00	2025-11-18 16:35:30.227+09	2025-11-18 16:35:20.001503+09	2025-11-18 16:35:35.053024+09	1	3	0	[]	f	\N	0
152	4	27500.00	2025-11-13 23:49:24.498+09	2025-11-13 10:59:51.819671+09	2025-11-13 23:49:26.999971+09	1	5	0	[]	f	\N	0
162	4	27500.00	2025-11-13 23:50:04.075+09	2025-11-13 23:49:48.831575+09	2025-11-13 23:50:04.178076+09	1	5	0	[]	f	\N	0
198	3	0.00	2025-11-18 16:37:26.826+09	2025-11-18 14:23:16.695356+09	2025-11-18 16:37:29.327978+09	2	2	0	[]	f	\N	0
185	1	42351.00	2025-11-15 18:19:56.659+09	2025-11-15 17:51:19.069945+09	2025-11-15 18:19:58.077088+09	2	2	0	[]	f	\N	0
164	1	0.00	\N	2025-11-13 23:56:06.018618+09	2025-11-14 01:13:34.295949+09	2	2	0	[{"count": 7, "timestamp": 1763050133789}]	f	\N	0
166	3	544500.00	2025-11-14 01:50:13.413+09	2025-11-14 01:31:45.733348+09	2025-11-14 01:50:13.603466+09	1	99	0	[]	f	\N	0
188	5	0.00	2025-11-18 13:36:02.067+09	2025-11-18 12:52:37.517559+09	2025-11-18 13:36:03.145141+09	1	2	0	[]	f	\N	0
168	3	544500.00	2025-11-14 01:51:17.359+09	2025-11-14 01:51:12.653643+09	2025-11-14 01:51:17.495779+09	1	99	0	[]	f	\N	0
211	3	0.00	2025-11-18 16:38:09.938+09	2025-11-18 16:37:36.149632+09	2025-11-18 16:38:11.21707+09	2	2	0	[]	f	\N	0
170	3	544500.00	2025-11-14 01:52:18.425+09	2025-11-14 01:52:11.545456+09	2025-11-14 01:52:18.63896+09	1	99	0	[]	f	\N	0
226	3	0.00	2025-11-18 17:11:59.963+09	2025-11-18 17:11:19.136362+09	2025-11-18 17:12:00.826846+09	1	2	0	[]	f	\N	0
197	5	0.00	2025-11-18 16:39:52.418+09	2025-11-18 14:11:40.703333+09	2025-11-18 16:39:53.961889+09	2	5	0	[]	f	\N	0
172	1	33000.00	2025-11-14 01:58:50.072+09	2025-11-14 01:58:26.144822+09	2025-11-14 01:58:50.241849+09	1	6	0	[]	f	\N	0
212	5	0.00	2025-11-18 16:41:27.395+09	2025-11-18 16:40:20.840681+09	2025-11-18 16:41:28.085996+09	2	6	0	[{"count": 6, "timestamp": 1763451674267}]	f	\N	0
190	5	41830.00	2025-11-18 13:56:12.67+09	2025-11-18 13:46:41.879056+09	2025-11-18 13:56:17.359187+09	2	2	0	[]	f	\N	0
174	1	33001.00	2025-11-14 02:19:51.831+09	2025-11-14 02:18:49.712413+09	2025-11-14 02:19:52.276083+09	1	6	0	[]	f	\N	0
213	3	0.00	2025-11-18 16:42:31.218+09	2025-11-18 16:42:20.453016+09	2025-11-18 16:42:31.772337+09	1	2	0	[]	f	\N	0
176	1	30250.00	2025-11-14 02:22:27.073+09	2025-11-14 02:21:16.423452+09	2025-11-14 02:22:27.542825+09	1	5	0	[]	f	\N	0
220	3	0.00	2025-11-18 17:02:37.987+09	2025-11-18 17:01:43.509042+09	2025-11-18 17:02:39.01335+09	1	2	0	[]	f	\N	0
192	3	0.00	2025-11-18 14:11:11.462+09	2025-11-18 14:02:14.879593+09	2025-11-18 14:11:11.586725+09	1	2	0	[]	f	\N	0
178	3	41030.00	2025-11-14 15:29:05.905+09	2025-11-14 12:26:25.863164+09	2025-11-14 15:29:09.661338+09	2	2	0	[]	f	\N	0
214	3	0.00	2025-11-18 16:44:04.461+09	2025-11-18 16:42:39.569661+09	2025-11-18 16:44:04.674635+09	1	2	0	[]	f	\N	0
195	1	0.00	2025-11-18 14:11:22.244+09	2025-11-18 14:03:05.322386+09	2025-11-18 14:11:22.560104+09	1	2	0	[]	f	\N	0
200	4	0.00	2025-11-18 15:49:04.288+09	2025-11-18 15:19:43.340696+09	2025-11-18 15:49:05.650745+09	1	6	0	[]	f	\N	0
215	3	0.00	2025-11-18 16:49:03.347+09	2025-11-18 16:44:13.050385+09	2025-11-18 16:49:04.121303+09	1	2	0	[]	f	\N	0
202	4	0.00	2025-11-18 16:02:04.325+09	2025-11-18 15:58:43.51968+09	2025-11-18 16:02:05.816151+09	1	5	0	[]	f	\N	0
231	3	0.00	2025-11-18 17:22:44.459+09	2025-11-18 17:22:37.088641+09	2025-11-18 17:22:45.234952+09	1	2	0	[]	f	\N	0
221	3	0.00	2025-11-18 17:04:01.555+09	2025-11-18 17:03:45.068279+09	2025-11-18 17:04:02.073626+09	1	2	0	[]	f	\N	0
204	4	0.00	2025-11-18 16:21:41.441+09	2025-11-18 16:13:54.26889+09	2025-11-18 16:21:45.419105+09	1	5	0	[]	f	\N	0
206	4	0.00	2025-11-18 16:22:32.977+09	2025-11-18 16:22:23.610864+09	2025-11-18 16:22:33.03872+09	1	5	0	[]	f	\N	0
216	3	0.00	2025-11-18 16:49:52.251+09	2025-11-18 16:49:26.414419+09	2025-11-18 16:49:55.286013+09	1	2	0	[]	f	\N	0
240	4	0.00	2025-11-18 20:20:21.681+09	2025-11-18 18:38:49.261436+09	2025-11-18 20:22:04.666476+09	3	5	0	[]	f	\N	0
217	3	0.00	2025-11-18 16:50:55.866+09	2025-11-18 16:50:45.201347+09	2025-11-18 16:50:56.498775+09	1	2	0	[]	f	\N	0
227	3	45452.00	2025-11-18 17:13:39.499+09	2025-11-18 17:12:10.321614+09	2025-11-18 17:13:43.379501+09	1	2	0	[]	f	\N	0
222	3	0.00	2025-11-18 17:09:48.043+09	2025-11-18 17:06:57.230255+09	2025-11-18 17:09:49.170159+09	1	2	0	[]	f	\N	0
218	3	0.00	2025-11-18 17:01:18.451+09	2025-11-18 16:51:15.403438+09	2025-11-18 17:01:25.562882+09	1	2	0	[]	f	\N	0
223	3	0.00	2025-11-18 17:09:59.499+09	2025-11-18 17:09:52.216017+09	2025-11-18 17:10:02.15993+09	1	2	0	[]	f	\N	0
237	3	13200.00	2025-11-18 17:43:27.532+09	2025-11-18 17:38:34.567591+09	2025-11-18 17:43:34.704405+09	1	2	0	[]	f	\N	0
224	3	0.00	2025-11-18 17:10:13.5+09	2025-11-18 17:10:06.914769+09	2025-11-18 17:10:14.099453+09	1	2	0	[]	f	\N	0
228	3	11000.00	2025-11-18 17:17:22.987+09	2025-11-18 17:14:19.892112+09	2025-11-18 17:17:24.874863+09	1	2	0	[]	f	\N	0
225	3	0.00	2025-11-18 17:10:37.331+09	2025-11-18 17:10:17.487955+09	2025-11-18 17:10:38.020413+09	1	2	0	[]	f	\N	0
232	3	13200.00	2025-11-18 17:31:15.077+09	2025-11-18 17:22:51.480288+09	2025-11-18 17:31:19.380415+09	1	2	0	[]	f	\N	0
235	3	22000.00	2025-11-18 17:37:17.612+09	2025-11-18 17:34:44.48173+09	2025-11-18 17:37:22.804038+09	1	2	0	[]	f	\N	0
233	3	0.00	2025-11-18 17:32:12.74+09	2025-11-18 17:31:23.596512+09	2025-11-18 17:32:19.940764+09	1	2	0	[]	f	\N	0
230	3	0.00	2025-11-18 17:22:10.699+09	2025-11-18 17:21:55.363882+09	2025-11-18 17:22:12.813427+09	1	2	0	[]	f	\N	0
229	3	0.00	2025-11-18 17:22:21.364+09	2025-11-18 17:17:51.760683+09	2025-11-18 17:22:29.210649+09	1	2	0	[]	f	\N	0
239	4	29700.00	2025-11-18 17:51:37.284+09	2025-11-18 17:49:02.404234+09	2025-11-18 17:54:45.266158+09	1	5	0	[]	f	\N	0
234	3	13200.00	2025-11-18 17:34:31.933+09	2025-11-18 17:32:42.341271+09	2025-11-18 17:34:34.424128+09	1	2	0	[]	f	\N	0
243	4	0.00	\N	2025-11-18 20:54:24.264361+09	2025-11-18 21:37:05.702211+09	1	3	0	[]	f	\N	0
236	3	11000.00	2025-11-18 17:38:21.66+09	2025-11-18 17:37:33.841225+09	2025-11-18 17:38:23.788787+09	1	2	0	[]	f	\N	0
238	3	12452.00	2025-11-18 17:48:20.316+09	2025-11-18 17:43:46.464738+09	2025-11-18 17:48:40.944483+09	1	2	0	[]	f	\N	0
241	4	0.00	2025-11-18 20:43:23.691+09	2025-11-18 20:37:56.690844+09	2025-11-18 20:49:58.165364+09	1	5	0	[]	f	\N	0
245	4	0.00	2025-11-18 22:06:12.447+09	2025-11-18 21:41:41.914989+09	2025-11-18 22:06:45.051066+09	2	8	0	[]	f	\N	0
242	4	0.00	\N	2025-11-18 20:53:11.414852+09	2025-11-18 21:37:12.606762+09	1	3	0	[]	f	\N	0
244	1	0.00	2025-11-18 21:35:42.668+09	2025-11-18 21:16:06.658349+09	2025-11-18 21:37:02.083458+09	1	3	0	[]	f	\N	0
246	1	0.00	2025-11-18 22:07:15.021+09	2025-11-18 21:42:05.995059+09	2025-11-18 22:07:47.676269+09	1	3	0	[]	f	\N	0
247	1	0.00	2025-11-18 22:36:03.454+09	2025-11-18 22:13:41.611745+09	2025-11-18 22:36:08.282526+09	2	3	0	[{"count": 6, "timestamp": 1763471917613}]	f	\N	0
248	4	0.00	2025-11-18 22:29:26.67+09	2025-11-18 22:13:52.009289+09	2025-11-18 22:38:28.540622+09	2	8	0	[{"count": 8, "timestamp": 1763471904160}]	f	\N	0
249	1	0.00	2025-11-18 23:40:40.12+09	2025-11-18 22:54:55.759456+09	2025-11-18 23:40:41.995387+09	1	3	0	[]	f	\N	0
250	4	0.00	2025-11-18 23:41:03.088+09	2025-11-18 22:55:22.910565+09	2025-11-18 23:41:03.501096+09	2	8	0	[]	f	\N	0
251	1	0.00	2025-11-19 00:38:38.898+09	2025-11-18 23:47:14.535909+09	2025-11-19 00:38:40.493049+09	1	3	0	[]	f	\N	0
252	1	0.00	2025-11-19 00:39:41.418+09	2025-11-19 00:38:41.611862+09	2025-11-19 00:39:41.566422+09	1	3	0	[]	f	\N	0
253	1	0.00	2025-11-19 00:59:09.139+09	2025-11-19 00:39:43.268525+09	2025-11-19 00:59:10.714358+09	1	3	0	[]	f	\N	0
254	1	0.00	2025-11-19 01:08:18.003+09	2025-11-19 00:59:12.403532+09	2025-11-19 01:08:20.067089+09	1	3	0	[]	f	\N	0
255	1	0.00	2025-11-19 01:16:50.652+09	2025-11-19 01:08:36.075516+09	2025-11-19 01:16:56.262369+09	1	3	0	[]	f	\N	0
271	3	0.00	2025-12-11 15:46:56.876+09	2025-12-11 15:31:29.067998+09	2025-12-11 15:46:56.92104+09	1	2	0	[]	t	2025-12-11 15:46:51.763+09	845
256	1	0.00	2025-11-19 01:22:54.876+09	2025-11-19 01:16:59.113087+09	2025-11-19 01:22:55.668748+09	1	3	0	[]	f	\N	0
257	1	0.00	2025-11-19 01:23:35.828+09	2025-11-19 01:23:08.147951+09	2025-11-19 01:23:36.086153+09	1	3	0	[]	f	\N	0
269	4	0.00	2025-12-11 14:22:20.091+09	2025-12-11 12:39:48.381831+09	2025-12-11 14:23:19.745174+09	1	5	0	[]	f	\N	19
259	4	0.00	2025-11-19 01:56:19.509+09	2025-11-19 01:55:38.297369+09	2025-11-19 01:56:21.618108+09	1	8	0	[]	f	\N	0
258	1	0.00	2025-11-19 01:56:56.661+09	2025-11-19 01:31:36.024015+09	2025-11-19 01:56:58.002669+09	1	3	0	[]	f	\N	0
272	5	0.00	2025-12-11 22:07:53.555+09	2025-12-11 15:47:56.272909+09	2025-12-11 22:07:55.18518+09	1	5	0	[]	t	2025-12-11 15:48:18.115+09	13
261	4	0.00	2025-11-19 02:20:22.47+09	2025-11-19 01:58:10.995281+09	2025-11-19 02:20:25.004504+09	1	8	0	[]	f	\N	0
274	4	0.00	\N	2025-12-11 22:25:56.071137+09	2025-12-11 22:25:56.071137+09	1	5	1	[]	t	2025-12-11 22:25:56.07+09	0
260	1	0.00	2025-11-19 02:38:31.206+09	2025-11-19 01:57:16.391567+09	2025-11-19 02:38:41.224134+09	1	3	0	[]	f	\N	0
273	3	0.00	2025-12-14 20:01:35.323+09	2025-12-11 22:17:32.799755+09	2025-12-14 20:02:35.290779+09	1	2	0	[]	t	2025-12-11 22:17:32.798+09	0
263	1	0.00	2025-11-19 02:50:05.499+09	2025-11-19 02:39:13.647464+09	2025-11-19 02:50:09.333462+09	1	6	0	[]	f	\N	0
264	1	0.00	2025-11-19 02:52:32.255+09	2025-11-19 02:50:55.584244+09	2025-11-19 02:55:02.153274+09	1	5	0	[]	f	\N	0
265	1	0.00	2025-11-19 03:01:17.111+09	2025-11-19 02:56:14.042431+09	2025-11-19 03:03:13.099772+09	1	5	0	[]	f	\N	0
266	1	34452.00	2025-11-19 08:33:30.378+09	2025-11-19 03:06:03.932949+09	2025-11-19 08:33:31.621987+09	2	5	0	[]	f	\N	0
267	1	0.00	2025-12-11 02:37:58.99+09	2025-11-19 08:34:48.380141+09	2025-12-11 02:38:00.421081+09	2	5	0	[]	f	\N	0
262	4	0.00	2025-12-11 02:38:06.861+09	2025-11-19 02:32:31.109885+09	2025-12-11 02:38:06.942132+09	1	8	0	[]	f	\N	0
268	4	0.00	2025-12-11 12:39:17.086+09	2025-12-11 02:38:28.043324+09	2025-12-11 12:39:40.919932+09	1	5	0	[]	f	\N	0
270	3	0.00	2025-12-11 15:31:21.82+09	2025-12-11 14:25:41.338097+09	2025-12-11 15:31:22.910557+09	1	2	0	[]	f	\N	245
\.


--
-- Data for Name: shift; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.shift (id, cast_id, date, created_at, updated_at) FROM stdin;
1	10	2025-12-01	2025-12-11 23:17:12.696851+09	2025-12-11 23:17:12.696851+09
2	5	2025-12-05	2025-12-11 23:17:16.891738+09	2025-12-11 23:17:16.891738+09
3	9	2025-12-10	2025-12-11 23:17:27.491875+09	2025-12-11 23:17:27.491875+09
4	10	2025-12-04	2025-12-11 23:21:36.359803+09	2025-12-11 23:21:36.359803+09
5	10	2025-12-05	2025-12-11 23:21:41.225969+09	2025-12-11 23:21:41.225969+09
6	10	2025-12-31	2025-12-11 23:21:46.705587+09	2025-12-11 23:21:46.705587+09
8	4	2025-12-10	2025-12-11 23:28:09.613539+09	2025-12-11 23:28:09.613539+09
10	5	2025-12-10	2025-12-11 23:28:22.149809+09	2025-12-11 23:28:22.149809+09
11	5	2025-12-11	2025-12-11 23:28:24.572668+09	2025-12-11 23:28:24.572668+09
12	9	2025-12-06	2025-12-11 23:40:37.34038+09	2025-12-11 23:40:37.34038+09
13	5	2025-12-18	2025-12-11 23:41:24.897918+09	2025-12-11 23:41:24.897918+09
14	8	2025-11-01	2025-12-11 23:41:38.40198+09	2025-12-11 23:41:38.40198+09
15	10	2025-11-11	2025-12-11 23:41:43.038603+09	2025-12-11 23:41:43.038603+09
16	4	2025-11-20	2025-12-11 23:41:46.900062+09	2025-12-11 23:41:46.900062+09
17	8	2025-11-26	2025-12-11 23:41:51.64735+09	2025-12-11 23:41:51.64735+09
18	9	2025-12-15	2025-12-11 23:45:17.371814+09	2025-12-11 23:45:17.371814+09
19	8	2025-12-11	2025-12-11 23:56:50.536253+09	2025-12-11 23:56:50.536253+09
20	8	2025-12-04	2025-12-11 23:58:11.891337+09	2025-12-11 23:58:11.891337+09
21	5	2025-12-06	2025-12-12 00:07:44.305704+09	2025-12-12 00:07:44.305704+09
22	5	2025-12-09	2025-12-12 00:09:55.138159+09	2025-12-12 00:09:55.138159+09
23	8	2025-12-23	2025-12-12 00:41:49.198458+09	2025-12-12 00:41:49.198458+09
24	5	2025-12-04	2025-12-12 02:19:35.398718+09	2025-12-12 02:19:35.398718+09
25	5	2025-12-02	2025-12-12 02:19:40.522913+09	2025-12-12 02:19:40.522913+09
26	10	2025-12-06	2025-12-12 02:22:21.378249+09	2025-12-12 02:22:21.378249+09
27	9	2025-12-02	2025-12-12 02:26:37.116841+09	2025-12-12 02:26:37.116841+09
28	9	2025-12-08	2025-12-12 02:26:42.531215+09	2025-12-12 02:26:42.531215+09
29	9	2025-12-05	2025-12-12 02:30:11.412225+09	2025-12-12 02:30:11.412225+09
31	8	2025-12-06	2025-12-12 02:54:34.764376+09	2025-12-12 02:54:34.764376+09
33	8	2025-12-05	2025-12-12 02:54:38.250069+09	2025-12-12 02:54:38.250069+09
35	9	2025-12-07	2025-12-12 02:54:45.899554+09	2025-12-12 02:54:45.899554+09
\.


--
-- Data for Name: table; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public."table" (id, name, capacity, other, created_at, updated_at) FROM stdin;
2	テーブル2	6	一般席	2025-10-22 10:25:40.611586+09	2025-10-22 10:25:40.611586+09
3	テーブル3	2	カップル席	2025-10-22 10:25:40.611586+09	2025-10-22 10:25:40.611586+09
4	テーブル4	8	グループ席	2025-10-22 10:25:40.611586+09	2025-10-22 10:25:40.611586+09
1	テーブル1	6	VIP席	2025-10-22 10:25:40.611586+09	2025-10-22 10:49:00.652853+09
5	テーブル5	6	一般席	2025-10-22 10:25:40.611586+09	2025-10-24 22:14:39.2666+09
\.


--
-- Data for Name: user; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public."user" (id, name, mail, password, role, drink_back, food_back, main_nomination, inside_nomination, created_at, updated_at, other, hourly_price, together_nomination, attendance_status) FROM stdin;
1	Admin	admin@example.com	eb5eb52d7efb07d90d05fcf5c7516fe5	admin	0.00	0.00	0.00	0.00	2025-10-22 10:25:40.611586+09	2025-12-14 20:53:32.975618+09		1700.00	0.00	0
4	hana	hana@example.com	52fd46504e1b86d80cfa22c0a1168a9d	cast	0.30	0.90	0.50	0.30	2025-10-22 12:08:10.805427+09	2025-12-14 20:53:32.978255+09	sdlkfsdf	1700.00	0.70	1
8	nari	nari@gmail.comee	bb6cfd9ab43a78293292ca4e3056cf1d	cast	0.60	0.40	0.50	0.30	2025-11-03 09:06:23.335653+09	2025-11-12 22:58:47.323643+09		1400.00	0.70	0
9	haro	haro@example.com	0ae716bc73a7d78c9ed6ed7342f2fb6a	cast	0.20	0.30	0.50	0.30	2025-11-03 11:13:38.414863+09	2025-11-12 22:58:48.265317+09		1500.00	0.70	0
10	senda	senda@example.com	67e15d38158f2fff3e88237a3077cd4d	cast	0.50	0.60	0.50	0.30	2025-11-12 12:08:06.385379+09	2025-11-12 22:58:53.905659+09		0.00	0.70	0
5	aiko	aiko@example.com	0ae716bc73a7d78c9ed6ed7342f2fb6a	cast	0.40	0.60	0.50	0.30	2025-10-22 12:10:22.636516+09	2025-12-11 22:27:00.7818+09		1200.00	0.70	1
\.


--
-- Name: add_charges_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.add_charges_id_seq', 22557, true);


--
-- Name: additional_services_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.additional_services_id_seq', 7, true);


--
-- Name: attendance_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.attendance_id_seq', 31, true);


--
-- Name: bottle_keep_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.bottle_keep_id_seq', 1, true);


--
-- Name: callmanager_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.callmanager_id_seq', 33, true);


--
-- Name: category_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.category_id_seq', 5, true);


--
-- Name: nomination_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.nomination_id_seq', 126, true);


--
-- Name: product_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.product_id_seq', 10, true);


--
-- Name: project_variable_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.project_variable_id_seq', 211, true);


--
-- Name: salary_attenday_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.salary_attenday_id_seq', 7, true);


--
-- Name: salary_category_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.salary_category_id_seq', 50, true);


--
-- Name: salary_full_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.salary_full_id_seq', 8, true);


--
-- Name: salary_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.salary_id_seq', 606, true);


--
-- Name: salesorder_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.salesorder_id_seq', 133, true);


--
-- Name: serviceorder_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.serviceorder_id_seq', 26, true);


--
-- Name: services_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.services_id_seq', 8, true);


--
-- Name: sessions_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.sessions_id_seq', 274, true);


--
-- Name: shift_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.shift_id_seq', 35, true);


--
-- Name: table_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.table_id_seq', 25, true);


--
-- Name: user_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.user_id_seq', 10, true);


--
-- Name: add_charges add_charges_charge_name_key; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.add_charges
    ADD CONSTRAINT add_charges_charge_name_key UNIQUE (charge_name);


--
-- Name: add_charges add_charges_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.add_charges
    ADD CONSTRAINT add_charges_pkey PRIMARY KEY (id);


--
-- Name: additional_services additional_services_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.additional_services
    ADD CONSTRAINT additional_services_pkey PRIMARY KEY (id);


--
-- Name: attendance attendance_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.attendance
    ADD CONSTRAINT attendance_pkey PRIMARY KEY (id);


--
-- Name: bottle_keep bottle_keep_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.bottle_keep
    ADD CONSTRAINT bottle_keep_pkey PRIMARY KEY (id);


--
-- Name: callmanager callmanager_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.callmanager
    ADD CONSTRAINT callmanager_pkey PRIMARY KEY (id);


--
-- Name: category category_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.category
    ADD CONSTRAINT category_pkey PRIMARY KEY (id);


--
-- Name: nomination nomination_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.nomination
    ADD CONSTRAINT nomination_pkey PRIMARY KEY (id);


--
-- Name: product product_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.product
    ADD CONSTRAINT product_pkey PRIMARY KEY (id);


--
-- Name: product product_sku_key; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.product
    ADD CONSTRAINT product_sku_key UNIQUE (sku);


--
-- Name: project_variable project_variable_name_key; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.project_variable
    ADD CONSTRAINT project_variable_name_key UNIQUE (name);


--
-- Name: project_variable project_variable_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.project_variable
    ADD CONSTRAINT project_variable_pkey PRIMARY KEY (id);


--
-- Name: salary_attenday salary_attenday_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.salary_attenday
    ADD CONSTRAINT salary_attenday_pkey PRIMARY KEY (id);


--
-- Name: salary_category salary_category_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.salary_category
    ADD CONSTRAINT salary_category_pkey PRIMARY KEY (id);


--
-- Name: salary_full salary_full_category_id_key; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.salary_full
    ADD CONSTRAINT salary_full_category_id_key UNIQUE (category_id);


--
-- Name: salary_full salary_full_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.salary_full
    ADD CONSTRAINT salary_full_pkey PRIMARY KEY (id);


--
-- Name: salary salary_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.salary
    ADD CONSTRAINT salary_pkey PRIMARY KEY (id);


--
-- Name: salary salary_user_id_year_month_key; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.salary
    ADD CONSTRAINT salary_user_id_year_month_key UNIQUE (user_id, year, month);


--
-- Name: salesorder salesorder_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.salesorder
    ADD CONSTRAINT salesorder_pkey PRIMARY KEY (id);


--
-- Name: serviceorder serviceorder_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.serviceorder
    ADD CONSTRAINT serviceorder_pkey PRIMARY KEY (id);


--
-- Name: services services_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.services
    ADD CONSTRAINT services_pkey PRIMARY KEY (id);


--
-- Name: sessions sessions_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.sessions
    ADD CONSTRAINT sessions_pkey PRIMARY KEY (id);


--
-- Name: shift shift_cast_id_date_key; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.shift
    ADD CONSTRAINT shift_cast_id_date_key UNIQUE (cast_id, date);


--
-- Name: shift shift_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.shift
    ADD CONSTRAINT shift_pkey PRIMARY KEY (id);


--
-- Name: table table_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public."table"
    ADD CONSTRAINT table_pkey PRIMARY KEY (id);


--
-- Name: user user_mail_key; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public."user"
    ADD CONSTRAINT user_mail_key UNIQUE (mail);


--
-- Name: user user_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public."user"
    ADD CONSTRAINT user_pkey PRIMARY KEY (id);


--
-- Name: idx_add_charges_name; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_add_charges_name ON public.add_charges USING btree (charge_name);


--
-- Name: idx_additional_services_service_type; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_additional_services_service_type ON public.additional_services USING btree (service_type);


--
-- Name: idx_additional_services_session_id; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_additional_services_session_id ON public.additional_services USING btree (session_id);


--
-- Name: idx_attendance_clock_in; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_attendance_clock_in ON public.attendance USING btree (clock_in);


--
-- Name: idx_attendance_staff_id; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_attendance_staff_id ON public.attendance USING btree (staff_id);


--
-- Name: idx_attendance_status; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_attendance_status ON public.attendance USING btree (status);


--
-- Name: idx_bottle_keep_client_email; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_bottle_keep_client_email ON public.bottle_keep USING btree (client_email);


--
-- Name: idx_bottle_keep_session_id; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_bottle_keep_session_id ON public.bottle_keep USING btree (session_id);


--
-- Name: idx_bottle_keep_table_id; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_bottle_keep_table_id ON public.bottle_keep USING btree (table_id);


--
-- Name: idx_callmanager_calltype; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_callmanager_calltype ON public.callmanager USING btree (calltype);


--
-- Name: idx_callmanager_cast_id; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_callmanager_cast_id ON public.callmanager USING btree (cast_id);


--
-- Name: idx_callmanager_created_at; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_callmanager_created_at ON public.callmanager USING btree (created_at);


--
-- Name: idx_callmanager_session_id; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_callmanager_session_id ON public.callmanager USING btree (session_id);


--
-- Name: idx_callmanager_status; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_callmanager_status ON public.callmanager USING btree (status);


--
-- Name: idx_callmanager_table_id; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_callmanager_table_id ON public.callmanager USING btree (table_id);


--
-- Name: idx_category_name; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_category_name ON public.category USING btree (name);


--
-- Name: idx_nomination_cast_id; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_nomination_cast_id ON public.nomination USING btree (cast_id);


--
-- Name: idx_nomination_session_id; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_nomination_session_id ON public.nomination USING btree (session_id);


--
-- Name: idx_nomination_table_id; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_nomination_table_id ON public.nomination USING btree (table_id);


--
-- Name: idx_nomination_type_id; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_nomination_type_id ON public.nomination USING btree (type_id);


--
-- Name: idx_product_category; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_product_category ON public.product USING btree (category_id);


--
-- Name: idx_product_name; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_product_name ON public.product USING btree (name);


--
-- Name: idx_product_sku; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_product_sku ON public.product USING btree (sku);


--
-- Name: idx_project_variable_name; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_project_variable_name ON public.project_variable USING btree (name);


--
-- Name: idx_salary_attenday_attenday_number; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_salary_attenday_attenday_number ON public.salary_attenday USING btree (attenday_number);


--
-- Name: idx_salary_attenday_category_id; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_salary_attenday_category_id ON public.salary_attenday USING btree (category_id);


--
-- Name: idx_salary_category_cast_id; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_salary_category_cast_id ON public.salary_category USING btree (cast_id);


--
-- Name: idx_salary_category_category_id; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_salary_category_category_id ON public.salary_category USING btree (category_id);


--
-- Name: idx_salary_full_category_id; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_salary_full_category_id ON public.salary_full USING btree (category_id);


--
-- Name: idx_salary_user_month; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_salary_user_month ON public.salary USING btree (user_id, year, month);


--
-- Name: idx_salesorder_accepted_at; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_salesorder_accepted_at ON public.salesorder USING btree (accepted_at);


--
-- Name: idx_salesorder_accepted_by; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_salesorder_accepted_by ON public.salesorder USING btree (accepted_by);


--
-- Name: idx_salesorder_cast_id; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_salesorder_cast_id ON public.salesorder USING btree (cast_id);


--
-- Name: idx_salesorder_created_at; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_salesorder_created_at ON public.salesorder USING btree (created_at);


--
-- Name: idx_salesorder_product_id; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_salesorder_product_id ON public.salesorder USING btree (product_id);


--
-- Name: idx_salesorder_session_id; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_salesorder_session_id ON public.salesorder USING btree (session_id);


--
-- Name: idx_salesorder_status; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_salesorder_status ON public.salesorder USING btree (status);


--
-- Name: idx_salesorder_table_id; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_salesorder_table_id ON public.salesorder USING btree (table_id);


--
-- Name: idx_serviceorder_session_id; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_serviceorder_session_id ON public.serviceorder USING btree (session_id);


--
-- Name: idx_serviceorder_status; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_serviceorder_status ON public.serviceorder USING btree (status);


--
-- Name: idx_serviceorder_table_id; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_serviceorder_table_id ON public.serviceorder USING btree (table_id);


--
-- Name: idx_services_name; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_services_name ON public.services USING btree (name);


--
-- Name: idx_sessions_table_id; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_sessions_table_id ON public.sessions USING btree (table_id);


--
-- Name: idx_shift_cast_date; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_shift_cast_date ON public.shift USING btree (cast_id, date);


--
-- Name: idx_shift_cast_id; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_shift_cast_id ON public.shift USING btree (cast_id);


--
-- Name: idx_shift_date; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_shift_date ON public.shift USING btree (date);


--
-- Name: idx_table_name; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_table_name ON public."table" USING btree (name);


--
-- Name: idx_user_mail; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_user_mail ON public."user" USING btree (mail);


--
-- Name: idx_user_role; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_user_role ON public."user" USING btree (role);


--
-- Name: add_charges update_add_charges_updated_at; Type: TRIGGER; Schema: public; Owner: postgres
--

CREATE TRIGGER update_add_charges_updated_at BEFORE UPDATE ON public.add_charges FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: additional_services update_additional_services_updated_at; Type: TRIGGER; Schema: public; Owner: postgres
--

CREATE TRIGGER update_additional_services_updated_at BEFORE UPDATE ON public.additional_services FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: attendance update_attendance_updated_at; Type: TRIGGER; Schema: public; Owner: postgres
--

CREATE TRIGGER update_attendance_updated_at BEFORE UPDATE ON public.attendance FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: bottle_keep update_bottle_keep_updated_at; Type: TRIGGER; Schema: public; Owner: postgres
--

CREATE TRIGGER update_bottle_keep_updated_at BEFORE UPDATE ON public.bottle_keep FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: callmanager update_callmanager_updated_at; Type: TRIGGER; Schema: public; Owner: postgres
--

CREATE TRIGGER update_callmanager_updated_at BEFORE UPDATE ON public.callmanager FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: category update_category_updated_at; Type: TRIGGER; Schema: public; Owner: postgres
--

CREATE TRIGGER update_category_updated_at BEFORE UPDATE ON public.category FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: nomination update_nomination_updated_at; Type: TRIGGER; Schema: public; Owner: postgres
--

CREATE TRIGGER update_nomination_updated_at BEFORE UPDATE ON public.nomination FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: product update_product_updated_at; Type: TRIGGER; Schema: public; Owner: postgres
--

CREATE TRIGGER update_product_updated_at BEFORE UPDATE ON public.product FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: project_variable update_project_variable_updated_at; Type: TRIGGER; Schema: public; Owner: postgres
--

CREATE TRIGGER update_project_variable_updated_at BEFORE UPDATE ON public.project_variable FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: salary_attenday update_salary_attenday_updated_at; Type: TRIGGER; Schema: public; Owner: postgres
--

CREATE TRIGGER update_salary_attenday_updated_at BEFORE UPDATE ON public.salary_attenday FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: salary_category update_salary_category_updated_at; Type: TRIGGER; Schema: public; Owner: postgres
--

CREATE TRIGGER update_salary_category_updated_at BEFORE UPDATE ON public.salary_category FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: salary_full update_salary_full_updated_at; Type: TRIGGER; Schema: public; Owner: postgres
--

CREATE TRIGGER update_salary_full_updated_at BEFORE UPDATE ON public.salary_full FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: salesorder update_salesorder_updated_at; Type: TRIGGER; Schema: public; Owner: postgres
--

CREATE TRIGGER update_salesorder_updated_at BEFORE UPDATE ON public.salesorder FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: serviceorder update_serviceorder_updated_at; Type: TRIGGER; Schema: public; Owner: postgres
--

CREATE TRIGGER update_serviceorder_updated_at BEFORE UPDATE ON public.serviceorder FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: services update_services_updated_at; Type: TRIGGER; Schema: public; Owner: postgres
--

CREATE TRIGGER update_services_updated_at BEFORE UPDATE ON public.services FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: sessions update_sessions_updated_at; Type: TRIGGER; Schema: public; Owner: postgres
--

CREATE TRIGGER update_sessions_updated_at BEFORE UPDATE ON public.sessions FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: shift update_shift_updated_at; Type: TRIGGER; Schema: public; Owner: postgres
--

CREATE TRIGGER update_shift_updated_at BEFORE UPDATE ON public.shift FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: table update_table_updated_at; Type: TRIGGER; Schema: public; Owner: postgres
--

CREATE TRIGGER update_table_updated_at BEFORE UPDATE ON public."table" FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: user update_user_updated_at; Type: TRIGGER; Schema: public; Owner: postgres
--

CREATE TRIGGER update_user_updated_at BEFORE UPDATE ON public."user" FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: additional_services additional_services_session_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.additional_services
    ADD CONSTRAINT additional_services_session_id_fkey FOREIGN KEY (session_id) REFERENCES public.sessions(id) ON DELETE CASCADE;


--
-- Name: attendance attendance_approved_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.attendance
    ADD CONSTRAINT attendance_approved_by_fkey FOREIGN KEY (approved_by) REFERENCES public."user"(id);


--
-- Name: attendance attendance_staff_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.attendance
    ADD CONSTRAINT attendance_staff_id_fkey FOREIGN KEY (staff_id) REFERENCES public."user"(id) ON DELETE CASCADE;


--
-- Name: bottle_keep bottle_keep_session_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.bottle_keep
    ADD CONSTRAINT bottle_keep_session_id_fkey FOREIGN KEY (session_id) REFERENCES public.sessions(id) ON DELETE CASCADE;


--
-- Name: bottle_keep bottle_keep_table_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.bottle_keep
    ADD CONSTRAINT bottle_keep_table_id_fkey FOREIGN KEY (table_id) REFERENCES public."table"(id) ON DELETE CASCADE;


--
-- Name: callmanager callmanager_accepted_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.callmanager
    ADD CONSTRAINT callmanager_accepted_by_fkey FOREIGN KEY (accepted_by) REFERENCES public."user"(id);


--
-- Name: callmanager callmanager_cast_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.callmanager
    ADD CONSTRAINT callmanager_cast_id_fkey FOREIGN KEY (cast_id) REFERENCES public."user"(id) ON DELETE CASCADE;


--
-- Name: callmanager callmanager_session_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.callmanager
    ADD CONSTRAINT callmanager_session_id_fkey FOREIGN KEY (session_id) REFERENCES public.sessions(id) ON DELETE CASCADE;


--
-- Name: callmanager callmanager_table_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.callmanager
    ADD CONSTRAINT callmanager_table_id_fkey FOREIGN KEY (table_id) REFERENCES public."table"(id) ON DELETE CASCADE;


--
-- Name: nomination nomination_cast_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.nomination
    ADD CONSTRAINT nomination_cast_id_fkey FOREIGN KEY (cast_id) REFERENCES public."user"(id) ON DELETE CASCADE;


--
-- Name: nomination nomination_session_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.nomination
    ADD CONSTRAINT nomination_session_id_fkey FOREIGN KEY (session_id) REFERENCES public.sessions(id) ON DELETE CASCADE;


--
-- Name: nomination nomination_table_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.nomination
    ADD CONSTRAINT nomination_table_id_fkey FOREIGN KEY (table_id) REFERENCES public."table"(id) ON DELETE CASCADE;


--
-- Name: product product_category_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.product
    ADD CONSTRAINT product_category_id_fkey FOREIGN KEY (category_id) REFERENCES public.category(id) ON DELETE CASCADE;


--
-- Name: salary_category salary_category_cast_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.salary_category
    ADD CONSTRAINT salary_category_cast_id_fkey FOREIGN KEY (cast_id) REFERENCES public."user"(id) ON DELETE CASCADE;


--
-- Name: salary_full salary_full_category_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.salary_full
    ADD CONSTRAINT salary_full_category_id_fkey FOREIGN KEY (category_id) REFERENCES public.category(id) ON DELETE CASCADE;


--
-- Name: salary salary_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.salary
    ADD CONSTRAINT salary_user_id_fkey FOREIGN KEY (user_id) REFERENCES public."user"(id) ON DELETE CASCADE;


--
-- Name: salesorder salesorder_accepted_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.salesorder
    ADD CONSTRAINT salesorder_accepted_by_fkey FOREIGN KEY (accepted_by) REFERENCES public."user"(id);


--
-- Name: salesorder salesorder_cast_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.salesorder
    ADD CONSTRAINT salesorder_cast_id_fkey FOREIGN KEY (cast_id) REFERENCES public."user"(id) ON DELETE SET NULL;


--
-- Name: salesorder salesorder_product_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.salesorder
    ADD CONSTRAINT salesorder_product_id_fkey FOREIGN KEY (product_id) REFERENCES public.product(id) ON DELETE CASCADE;


--
-- Name: salesorder salesorder_session_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.salesorder
    ADD CONSTRAINT salesorder_session_id_fkey FOREIGN KEY (session_id) REFERENCES public.sessions(id) ON DELETE CASCADE;


--
-- Name: salesorder salesorder_table_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.salesorder
    ADD CONSTRAINT salesorder_table_id_fkey FOREIGN KEY (table_id) REFERENCES public."table"(id) ON DELETE CASCADE;


--
-- Name: serviceorder serviceorder_accepted_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.serviceorder
    ADD CONSTRAINT serviceorder_accepted_by_fkey FOREIGN KEY (accepted_by) REFERENCES public."user"(id);


--
-- Name: serviceorder serviceorder_cast_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.serviceorder
    ADD CONSTRAINT serviceorder_cast_id_fkey FOREIGN KEY (cast_id) REFERENCES public."user"(id) ON DELETE SET NULL;


--
-- Name: serviceorder serviceorder_service_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.serviceorder
    ADD CONSTRAINT serviceorder_service_id_fkey FOREIGN KEY (service_id) REFERENCES public.services(id) ON DELETE CASCADE;


--
-- Name: serviceorder serviceorder_session_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.serviceorder
    ADD CONSTRAINT serviceorder_session_id_fkey FOREIGN KEY (session_id) REFERENCES public.sessions(id) ON DELETE CASCADE;


--
-- Name: serviceorder serviceorder_table_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.serviceorder
    ADD CONSTRAINT serviceorder_table_id_fkey FOREIGN KEY (table_id) REFERENCES public."table"(id) ON DELETE CASCADE;


--
-- Name: sessions sessions_table_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.sessions
    ADD CONSTRAINT sessions_table_id_fkey FOREIGN KEY (table_id) REFERENCES public."table"(id) ON DELETE CASCADE;


--
-- Name: shift shift_cast_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.shift
    ADD CONSTRAINT shift_cast_id_fkey FOREIGN KEY (cast_id) REFERENCES public."user"(id) ON DELETE CASCADE;


--
-- PostgreSQL database dump complete
--

