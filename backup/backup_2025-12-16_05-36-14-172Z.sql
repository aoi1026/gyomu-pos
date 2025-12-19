--
-- PostgreSQL database dump
--

\restrict m2ZzwxPKVy5BFldaKTfpqWkfGFWaBuprQdhJBwXQPQSPMig0oIe78eCy52ySKgX

-- Dumped from database version 17.7 (Ubuntu 17.7-0ubuntu0.25.04.1)
-- Dumped by pg_dump version 17.7 (Ubuntu 17.7-0ubuntu0.25.04.1)

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
    cost numeric(10,2) DEFAULT 0.00,
    created_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
    updated_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
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
    food_back_yen numeric(12,2) DEFAULT 0.00,
    together_nomination_cost numeric(12,2) DEFAULT 0.00,
    together_nomination_count integer DEFAULT 0,
    together_nomination_fee numeric(12,2) DEFAULT 0.00,
    overtime_wage_yen numeric(12,2) DEFAULT 0.00,
    deduction_yen numeric(12,2) DEFAULT 0.00,
    total_pay_yen numeric(12,2) DEFAULT 0.00,
    created_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
    updated_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
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
    for_cast integer DEFAULT 0,
    status character varying(20) DEFAULT 'pending'::character varying,
    accepted_at timestamp with time zone,
    accepted_by integer,
    created_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
    updated_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
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
    accepted_at timestamp with time zone,
    accepted_by integer,
    created_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
    updated_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
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
    client integer,
    set_count integer DEFAULT 1,
    set_extensions jsonb DEFAULT '[]'::jsonb,
    status integer DEFAULT 0,
    created_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
    updated_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
    is_paused boolean DEFAULT false,
    paused_at timestamp with time zone,
    paused_elapsed integer DEFAULT 0,
    CONSTRAINT sessions_cost_check CHECK ((cost >= (0)::numeric)),
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
    food_back numeric(5,2) DEFAULT 0.00,
    drink_back numeric(5,2) DEFAULT 0.00,
    main_nomination numeric(5,2) DEFAULT 0.00,
    inside_nomination numeric(5,2) DEFAULT 0.00,
    hourly_price numeric(10,2) DEFAULT 0.00,
    other text,
    created_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
    updated_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
    together_nomination numeric(5,2) DEFAULT 0.00,
    attendance_status integer DEFAULT 0,
    CONSTRAINT user_bottle_back_check CHECK (((food_back >= (0)::numeric) AND (food_back <= (100)::numeric))),
    CONSTRAINT user_drink_back_check CHECK (((drink_back >= (0)::numeric) AND (drink_back <= (100)::numeric))),
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
1	main	0.00	\N	2025-11-13 17:29:57.171027+09	2025-11-13 17:29:57.171027+09
2	inside	0.00	\N	2025-11-13 17:29:57.171027+09	2025-11-13 17:29:57.171027+09
3	together	0.00	\N	2025-11-13 17:29:57.171027+09	2025-11-13 17:29:57.171027+09
4	bottle_keep	0.00	\N	2025-11-13 17:29:57.171027+09	2025-11-13 17:29:57.171027+09
5	vip_room	0.00	\N	2025-11-13 17:29:57.171027+09	2025-11-13 17:29:57.171027+09
6	song_room	0.00	1曲	2025-11-13 17:29:57.171027+09	2025-11-14 12:50:32.40693+09
3055	standard_date	5.00	\N	2025-12-15 14:52:34.968993+09	2025-12-15 14:52:34.968993+09
3056	regular	1900.00	\N	2025-12-15 14:52:34.972806+09	2025-12-15 14:52:34.972806+09
3057	arubaito	1700.00	\N	2025-12-15 14:52:34.974901+09	2025-12-15 14:52:34.974901+09
\.


--
-- Data for Name: additional_services; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.additional_services (id, session_id, service_type, count, charge, created_at, updated_at) FROM stdin;
\.


--
-- Data for Name: attendance; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.attendance (id, staff_id, clock_in, clock_out, total_work_hours, comment, detailed_times, status, approved_by, approved_at, created_at, updated_at) FROM stdin;
\.


--
-- Data for Name: bottle_keep; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.bottle_keep (id, client_name, client_email, bottle_name, amount, session_id, table_id, other, created_at, updated_at) FROM stdin;
\.


--
-- Data for Name: callmanager; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.callmanager (id, cast_id, table_id, session_id, calltype, status, accepted_at, accepted_by, created_at, updated_at) FROM stdin;
\.


--
-- Data for Name: category; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.category (id, name, other, created_at, updated_at) FROM stdin;
1	ボトル		2025-11-03 09:27:03.399729+09	2025-11-03 09:27:03.399729+09
3	フード		2025-11-03 09:27:31.094803+09	2025-11-03 09:27:31.094803+09
4	セット		2025-11-03 09:27:40.069907+09	2025-11-03 09:27:40.069907+09
2	カクテル		2025-11-03 09:27:20.116642+09	2025-12-15 17:35:08.517032+09
5	ショット		2025-12-15 17:36:59.164461+09	2025-12-15 17:36:59.164461+09
\.


--
-- Data for Name: nomination; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.nomination (id, cast_id, table_id, session_id, type_id, cost, created_at, updated_at) FROM stdin;
\.


--
-- Data for Name: product; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.product (id, category_id, name, sku, sale_price, amount, other, created_at, updated_at) FROM stdin;
4	1	山崎12年	BT004	40000.00	0		2025-11-03 11:26:43.041933+09	2025-11-03 11:26:43.041933+09
5	1	響 JAPANESE HARMONY	BT005	32000.00	0		2025-11-03 11:27:01.226722+09	2025-11-03 11:27:01.226722+09
17	4	同伴セット	ST002	8000.00	49		2025-11-03 11:30:26.743564+09	2025-12-09 19:34:42.143261+09
16	4	指名セット	ST001	5000.00	47		2025-11-03 11:30:14.548376+09	2025-12-09 19:49:32.332045+09
3	1	ヴーヴ・クリコ イエロー	BT003	28000.00	46		2025-11-03 11:26:21.995019+09	2025-11-04 08:57:23.154764+09
20	4	延長セット（30分）	ST005	3000.00	50		2025-11-03 11:31:15.131708+09	2025-11-04 11:14:03.835657+09
7	2	緑茶ハイ	DR002	800.00	50		2025-11-03 11:28:01.246216+09	2025-11-04 11:14:38.173101+09
13	3	ソーセージプレート	FD003	1500.00	50		2025-11-03 11:29:31.455928+09	2025-11-04 11:14:44.039916+09
11	3	チーズ盛り合わせ	FD001	1800.00	50		2025-11-03 11:28:57.165131+09	2025-11-04 11:14:49.719271+09
12	3	枝豆	FD002	700.00	50		2025-11-03 11:29:15.829568+09	2025-11-04 11:14:59.736459+09
15	3	唐揚げ	FD005	1200.00	50		2025-11-03 11:29:58.392858+09	2025-11-04 11:15:05.247423+09
14	3	フルーツ盛り合わせ	FD004	2000.00	47		2025-11-03 11:29:45.535423+09	2025-11-04 11:37:08.587006+09
2	1	モエ・エ・シャンドン ロゼ	BT002	35000.00	49		2025-11-03 11:25:59.003343+09	2025-11-04 11:37:20.659119+09
8	2	レモンサワー	DR003	900.00	49		2025-11-03 11:28:14.558593+09	2025-11-11 20:22:43.511391+09
18	4	VIPセット	ST003	15000.00	49		2025-11-03 11:30:38.470052+09	2025-11-14 14:48:45.726063+09
19	4	飲み放題セット（60分）	ST004	6000.00	46		2025-11-03 11:31:01.385162+09	2025-11-18 08:52:15.335512+09
1	1	ドン・ペリニヨン 白	BT001	55000.00	46		2025-11-03 11:25:32.835653+09	2025-11-18 21:23:52.850359+09
9	2	ジントニック	DR004	1000.00	47		2025-11-03 11:28:29.05383+09	2025-11-21 17:37:46.902423+09
10	2	カシスオレンジ	DR005	1000.00	49		2025-11-03 11:28:39.698316+09	2025-11-21 17:37:46.927078+09
6	2	ウーロンハイ	DR001	800.00	50		2025-11-03 11:27:33.46632+09	2025-12-09 17:54:52.52279+09
\.


--
-- Data for Name: project_variable; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.project_variable (id, name, value, other, created_at, updated_at) FROM stdin;
1	store_name	ⅠⅣ	店舗名	2025-11-14 12:31:43.887052+09	2025-11-21 09:50:42.491268+09
\.


--
-- Data for Name: salary; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.salary (id, user_id, year, month, basic_hours, base_pay, main_nomination_count, main_nomination_fee, inside_nomination_count, inside_nomination_fee, drink_back_yen, food_back_yen, together_nomination_cost, together_nomination_count, together_nomination_fee, overtime_wage_yen, deduction_yen, total_pay_yen, created_at, updated_at) FROM stdin;
41	10	2025	12	0.00	0.00	0	0.00	0	0.00	0.00	0.00	0.00	0	0.00	0.00	0.00	0.00	2025-12-16 13:25:42.868994+09	2025-12-16 13:25:42.868994+09
42	9	2025	12	0.00	0.00	0	0.00	0	0.00	0.00	0.00	0.00	0	0.00	0.00	0.00	0.00	2025-12-16 13:25:42.873842+09	2025-12-16 13:25:42.873842+09
\.


--
-- Data for Name: salary_attenday; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.salary_attenday (id, category_id, attenday_number, value, other, created_at, updated_at) FROM stdin;
1	2	1	200.00	\N	2025-12-15 14:53:59.045666+09	2025-12-15 17:30:40.229399+09
2	2	2	200.00	\N	2025-12-15 14:53:59.603066+09	2025-12-15 17:30:40.69387+09
3	2	3	200.00	\N	2025-12-15 14:54:00.463157+09	2025-12-15 17:30:41.11182+09
4	2	4	300.00	\N	2025-12-15 14:54:00.495203+09	2025-12-15 17:30:41.442675+09
6	2	6	300.00	\N	2025-12-15 14:54:00.751075+09	2025-12-15 17:30:41.457027+09
7	2	7	300.00	\N	2025-12-15 14:54:00.887467+09	2025-12-15 17:30:41.499573+09
5	2	5	300.00	\N	2025-12-15 14:54:00.640571+09	2025-12-15 17:30:41.503309+09
15	5	5	500.00	\N	2025-12-15 17:37:54.142676+09	2025-12-15 17:37:54.142676+09
16	5	6	500.00	\N	2025-12-15 17:37:54.187447+09	2025-12-15 17:37:54.187447+09
17	5	3	300.00	\N	2025-12-15 17:37:54.212307+09	2025-12-15 17:37:54.212307+09
18	5	1	300.00	\N	2025-12-15 17:37:54.212876+09	2025-12-15 17:37:54.212876+09
19	5	4	500.00	\N	2025-12-15 17:37:54.213708+09	2025-12-15 17:37:54.213708+09
20	5	2	300.00	\N	2025-12-15 17:37:54.233561+09	2025-12-15 17:37:54.233561+09
21	5	7	500.00	\N	2025-12-15 17:37:54.588858+09	2025-12-15 17:37:54.588858+09
\.


--
-- Data for Name: salary_category; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.salary_category (id, cast_id, category_id, value, other, created_at, updated_at) FROM stdin;
3	1	3	-1.00	\N	2025-12-15 14:55:09.520773+09	2025-12-15 14:55:09.520773+09
4	9	3	-1.00	\N	2025-12-15 14:55:09.520773+09	2025-12-15 14:55:09.520773+09
5	10	3	-1.00	\N	2025-12-15 14:55:09.520773+09	2025-12-15 14:55:09.520773+09
1	9	1	0.30	\N	2025-12-15 14:54:50.750191+09	2025-12-15 16:36:42.370119+09
2	10	1	0.25	\N	2025-12-15 14:54:50.753723+09	2025-12-15 16:36:48.991923+09
\.


--
-- Data for Name: salary_full; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.salary_full (id, category_id, other, created_at, updated_at) FROM stdin;
1	3	\N	2025-12-15 14:55:09.520773+09	2025-12-15 14:55:09.520773+09
\.


--
-- Data for Name: salesorder; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.salesorder (id, cast_id, product_id, amount, table_id, session_id, unit_price, total_price, for_cast, status, accepted_at, accepted_by, created_at, updated_at) FROM stdin;
1	\N	19	1	1	1	6000.00	6000.00	0	accepted	2025-11-13 19:01:05.697511+09	1	2025-11-13 18:24:25.862975+09	2025-11-13 19:01:05.697511+09
2	\N	18	1	2	5	15000.00	15000.00	0	accepted	2025-11-18 08:56:10.738312+09	1	2025-11-14 14:48:45.726063+09	2025-11-18 08:56:10.738312+09
5	\N	9	1	1	8	1000.00	1000.00	0	accepted	2025-11-18 09:07:09.192973+09	1	2025-11-18 09:06:53.931731+09	2025-11-18 09:07:09.192973+09
4	\N	10	1	1	8	1000.00	1000.00	0	accepted	2025-11-18 09:07:11.707808+09	1	2025-11-18 09:06:48.652783+09	2025-11-18 09:07:11.707808+09
11	\N	16	2	3	19	5000.00	10000.00	0	rejected	\N	\N	2025-12-09 17:48:38.079786+09	2025-12-09 17:54:52.524609+09
6	\N	9	2	1	9	1000.00	2000.00	1	accepted	2025-11-18 21:10:37.923441+09	1	2025-11-18 21:10:04.692446+09	2025-12-09 20:45:13.937735+09
7	\N	1	1	5	13	55000.00	55000.00	1	accepted	2025-11-19 09:06:32.486991+09	1	2025-11-18 21:23:52.850359+09	2025-12-09 20:45:13.937735+09
8	\N	16	2	1	14	5000.00	10000.00	1	accepted	2025-11-19 09:06:38.309627+09	1	2025-11-19 09:06:13.044728+09	2025-12-09 20:45:19.296135+09
9	\N	10	1	1	17	1000.00	1000.00	1	rejected	\N	\N	2025-11-21 16:39:32.781787+09	2025-12-09 20:45:19.296135+09
12	\N	6	2	3	19	800.00	1600.00	1	rejected	\N	\N	2025-12-09 17:48:58.000047+09	2025-12-09 20:45:19.296135+09
10	\N	9	2	1	17	1000.00	2000.00	1	rejected	\N	\N	2025-11-21 16:39:38.482186+09	2025-12-09 20:45:24.576733+09
13	\N	17	1	1	20	8000.00	8000.00	0	accepted	2025-12-10 18:44:08.265474+09	1	2025-12-09 19:34:42.143261+09	2025-12-10 18:44:08.265474+09
14	\N	16	1	1	20	5000.00	5000.00	1	accepted	2025-12-10 18:44:08.634989+09	1	2025-12-09 19:49:32.332045+09	2025-12-10 18:44:08.634989+09
\.


--
-- Data for Name: serviceorder; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.serviceorder (id, cast_id, service_id, amount, table_id, session_id, status, accepted_at, accepted_by, created_at, updated_at) FROM stdin;
3	\N	1	1	1	1	accepted	2025-11-13 19:01:09.871721+09	1	2025-11-13 18:59:55.282315+09	2025-11-13 19:01:09.871721+09
4	\N	4	1	1	17	accepted	2025-12-08 18:52:17.241586+09	1	2025-11-21 17:18:32.02586+09	2025-12-08 18:52:17.241586+09
5	\N	1	2	1	17	accepted	2025-12-08 18:52:15.304523+09	1	2025-11-21 17:18:38.558648+09	2025-12-09 20:45:24.576733+09
\.


--
-- Data for Name: services; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.services (id, name, other, created_at, updated_at) FROM stdin;
1	おしぼり	\N	2025-11-03 11:33:44.420468+09	2025-11-03 11:33:44.420468+09
2	灰皿交換	\N	2025-11-03 11:34:06.5054+09	2025-11-03 11:34:06.5054+09
3	グラス	\N	2025-11-03 11:34:17.48837+09	2025-11-03 11:34:17.48837+09
4	箸	\N	2025-11-03 11:35:23.195483+09	2025-11-03 11:35:23.195483+09
\.


--
-- Data for Name: sessions; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.sessions (id, table_id, cost, end_at, client, set_count, set_extensions, status, created_at, updated_at, is_paused, paused_at, paused_elapsed) FROM stdin;
2	3	11720500.00	2025-11-13 18:24:12.536+09	2131	1	[]	0	2025-11-13 18:24:32.921388+09	2025-11-13 18:24:45.864511+09	f	\N	0
17	1	24000.00	2025-11-21 18:10:40.832+09	2	2	[]	0	2025-11-21 16:39:14.475399+09	2025-11-21 18:10:41.846163+09	f	\N	0
3	2	11000.00	2025-11-14 02:29:00.134+09	2	1	[]	0	2025-11-14 02:28:37.578994+09	2025-11-14 02:29:05.433505+09	f	\N	0
18	2	0.00	2025-12-09 17:48:11.725+09	2	1	[]	0	2025-12-06 21:28:54.896549+09	2025-12-09 17:47:51.125447+09	f	\N	0
4	2	11000.00	2025-11-14 20:07:34.973+09	2	1	[]	0	2025-11-14 12:07:42.805269+09	2025-11-14 20:08:07.518789+09	f	\N	0
19	3	11000.00	2025-12-09 19:32:31.144+09	2	1	[]	0	2025-12-09 17:48:26.938433+09	2025-12-09 19:32:33.223933+09	f	\N	0
26	1	0.00	2025-12-15 21:32:19.996+09	2	1	[]	0	2025-12-15 21:26:09.861+09	2025-12-15 21:34:25.317979+09	t	2025-12-15 21:32:16.941+09	41
27	1	0.00	\N	2	1	[]	1	2025-12-16 08:51:14.829359+09	2025-12-16 08:51:14.829359+09	t	2025-12-16 08:51:14.829+09	0
8	1	13200.00	2025-11-18 09:15:05.226+09	2	1	[]	0	2025-11-18 08:41:31.075468+09	2025-11-18 09:15:05.677669+09	f	\N	0
6	3	11000.00	2025-11-18 21:05:58.163+09	2	1	[]	0	2025-11-14 20:08:09.546164+09	2025-11-18 21:06:14.770903+09	f	\N	0
7	2	0.00	2025-11-18 21:07:36.483+09	2	1	[]	0	2025-11-14 20:17:38.041728+09	2025-11-18 21:08:03.216106+09	f	\N	0
5	2	0.00	2025-11-18 21:07:53.011+09	2	1	[]	0	2025-11-14 14:48:33.249728+09	2025-11-18 21:08:11.902541+09	f	\N	0
1	1	0.00	2025-11-18 21:08:20.044+09	2	1	[]	0	2025-11-13 18:24:04.309005+09	2025-11-18 21:08:37.016915+09	f	\N	0
9	1	13200.00	2025-11-18 21:11:11.163+09	2	1	[]	0	2025-11-18 21:08:54.949177+09	2025-11-18 21:11:27.797549+09	f	\N	0
20	1	0.00	2025-12-12 18:19:06.568+09	2	3	[]	0	2025-12-09 19:33:00.835292+09	2025-12-12 18:19:06.257078+09	f	\N	0
10	1	0.00	2025-11-18 21:11:43.571+09	2	1	[]	0	2025-11-18 21:11:36.139427+09	2025-11-18 21:12:20.67187+09	f	\N	0
11	1	11000.00	2025-11-18 21:13:16.852+09	2	1	[]	0	2025-11-18 21:12:27.821342+09	2025-11-18 21:13:39.140677+09	f	\N	0
21	2	0.00	2025-12-12 20:20:54.112+09	2	1	[]	0	2025-12-11 17:12:19.587341+09	2025-12-12 20:21:51.402656+09	f	\N	67044
13	5	0.00	2025-11-18 21:28:48.996+09	2	1	[]	0	2025-11-18 21:23:06.308111+09	2025-11-18 21:30:16.972263+09	f	\N	0
12	2	22000.00	2025-11-19 09:03:10.787+09	2	2	[]	0	2025-11-18 21:20:05.591559+09	2025-11-19 09:03:25.92303+09	f	\N	0
23	2	0.00	2025-12-12 20:22:12.664+09	2	2	[]	0	2025-12-12 20:21:53.726766+09	2025-12-12 20:23:10.008519+09	t	2025-12-12 20:22:05.576+09	-5
14	1	22000.00	2025-11-19 09:06:51.555+09	2	1	[]	0	2025-11-19 09:04:21.410316+09	2025-11-19 09:07:07.58968+09	f	\N	0
15	1	0.00	2025-11-21 16:10:00.913+09	2	2	[]	0	2025-11-19 14:34:10.201234+09	2025-11-21 16:10:02.240724+09	f	\N	0
24	2	0.00	2025-12-12 23:21:48.928+09	2	3	[]	0	2025-12-12 23:20:33.166051+09	2025-12-12 23:22:45.637088+09	t	2025-12-12 23:20:33.165+09	0
16	1	0.00	2025-11-21 16:37:05.761+09	2	1	[]	0	2025-11-21 16:10:03.537191+09	2025-11-21 16:37:06.973782+09	f	\N	0
25	4	0.00	2025-12-15 21:19:21.3+09	2	4	[]	0	2025-12-12 23:22:57.661567+09	2025-12-15 21:19:24.999589+09	t	2025-12-12 23:22:57.661+09	0
22	1	0.00	2025-12-15 21:31:18.452+09	2	1	[]	0	2025-12-12 18:19:14.677709+09	2025-12-15 21:31:04.811114+09	f	\N	1431
\.


--
-- Data for Name: shift; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.shift (id, cast_id, date, created_at, updated_at) FROM stdin;
3	10	2025-12-01	2025-12-12 23:50:33.926844+09	2025-12-12 23:50:33.926844+09
\.


--
-- Data for Name: table; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public."table" (id, name, capacity, other, created_at, updated_at) FROM stdin;
1	テーブル1	2	VIP席	2025-11-01 12:06:24.751622+09	2025-11-01 12:06:24.751622+09
2	テーブル2	2	一般席	2025-11-01 12:06:24.751622+09	2025-11-01 12:06:24.751622+09
3	テーブル3	2	カップル席	2025-11-01 12:06:24.751622+09	2025-11-01 12:06:24.751622+09
4	テーブル4	2	グループ席	2025-11-01 12:06:24.751622+09	2025-11-01 12:06:24.751622+09
5	テーブル5	2	一般席	2025-11-01 12:06:24.751622+09	2025-11-01 12:06:24.751622+09
\.


--
-- Data for Name: user; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public."user" (id, name, mail, password, role, food_back, drink_back, main_nomination, inside_nomination, hourly_price, other, created_at, updated_at, together_nomination, attendance_status) FROM stdin;
1	システム管理者	admin@example.com	eb5eb52d7efb07d90d05fcf5c7516fe5	admin	0.00	0.00	0.00	0.00	0.00		2025-11-01 12:06:24.741024+09	2025-11-01 12:06:24.741024+09	0.00	0
9	aiko	aiko@example.com	4577c26c436a6c817fdc4c8b3ce6e031	cast	0.00	0.00	0.00	0.00	0.00		2025-12-12 23:24:40.216421+09	2025-12-12 23:24:40.216421+09	0.00	0
10	hiro	hiro@example.com	3f5215d48e31231d3da0a4bf858afa65	cast	0.00	0.00	0.00	0.00	0.00		2025-12-12 23:25:08.41302+09	2025-12-12 23:25:58.527761+09	0.00	1
\.


--
-- Name: add_charges_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.add_charges_id_seq', 3147, true);


--
-- Name: additional_services_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.additional_services_id_seq', 1, false);


--
-- Name: attendance_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.attendance_id_seq', 4, true);


--
-- Name: bottle_keep_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.bottle_keep_id_seq', 1, false);


--
-- Name: callmanager_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.callmanager_id_seq', 4, true);


--
-- Name: category_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.category_id_seq', 5, true);


--
-- Name: nomination_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.nomination_id_seq', 13, true);


--
-- Name: product_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.product_id_seq', 20, true);


--
-- Name: project_variable_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.project_variable_id_seq', 229, true);


--
-- Name: salary_attenday_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.salary_attenday_id_seq', 21, true);


--
-- Name: salary_category_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.salary_category_id_seq', 7, true);


--
-- Name: salary_full_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.salary_full_id_seq', 1, true);


--
-- Name: salary_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.salary_id_seq', 42, true);


--
-- Name: salesorder_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.salesorder_id_seq', 14, true);


--
-- Name: serviceorder_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.serviceorder_id_seq', 5, true);


--
-- Name: services_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.services_id_seq', 4, true);


--
-- Name: sessions_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.sessions_id_seq', 27, true);


--
-- Name: shift_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.shift_id_seq', 3, true);


--
-- Name: table_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.table_id_seq', 11, true);


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
-- Name: idx_serviceorder_cast_id; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_serviceorder_cast_id ON public.serviceorder USING btree (cast_id);


--
-- Name: idx_serviceorder_created_at; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_serviceorder_created_at ON public.serviceorder USING btree (created_at);


--
-- Name: idx_serviceorder_service_id; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_serviceorder_service_id ON public.serviceorder USING btree (service_id);


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
-- Name: idx_sessions_created_at; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_sessions_created_at ON public.sessions USING btree (created_at);


--
-- Name: idx_sessions_status; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_sessions_status ON public.sessions USING btree (status);


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

\unrestrict m2ZzwxPKVy5BFldaKTfpqWkfGFWaBuprQdhJBwXQPQSPMig0oIe78eCy52ySKgX

