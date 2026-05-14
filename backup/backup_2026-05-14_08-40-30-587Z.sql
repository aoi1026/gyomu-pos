--
-- PostgreSQL database dump
--

\restrict JuhqUrXQkA32JPiTfVnqHsWbdo6hy7egBHoJVZhgaTuIPgW7OcS9kqSbKohlWI2

-- Dumped from database version 18.2
-- Dumped by pg_dump version 18.2

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
    note text,
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
    image text,
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
-- Name: deduct; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.deduct (
    id integer NOT NULL,
    date date NOT NULL,
    value numeric(12,2) NOT NULL,
    reason text,
    other text,
    created_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
    updated_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT deduct_value_check CHECK ((value >= (0)::numeric))
);


ALTER TABLE public.deduct OWNER TO postgres;

--
-- Name: deduct_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.deduct_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.deduct_id_seq OWNER TO postgres;

--
-- Name: deduct_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.deduct_id_seq OWNED BY public.deduct.id;


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
    cost_cast numeric(10,2) DEFAULT 0.00,
    tomain_nomination integer DEFAULT 0,
    rank_cost numeric(12,2) DEFAULT 0.00,
    rank_point numeric(6,2) DEFAULT 0.00,
    created_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
    updated_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
    initial_nomination_cost numeric(10,2),
    CONSTRAINT nomination_cost_cast_check CHECK ((cost_cast >= (0)::numeric)),
    CONSTRAINT nomination_cost_check CHECK ((cost >= (0)::numeric)),
    CONSTRAINT nomination_rank_cost_check CHECK ((rank_cost >= (0)::numeric)),
    CONSTRAINT nomination_rank_point_check CHECK ((rank_point >= (0)::numeric)),
    CONSTRAINT nomination_tomain_nomination_check CHECK ((tomain_nomination = ANY (ARRAY[0, 1]))),
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
-- Name: notifications; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.notifications (
    id integer NOT NULL,
    type character varying(50) NOT NULL,
    table_id integer NOT NULL,
    table_label character varying(100),
    cast_name character varying(100),
    message text NOT NULL,
    priority character varying(20) DEFAULT 'medium'::character varying,
    status character varying(20) DEFAULT 'unread'::character varying,
    created_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
    updated_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT notifications_priority_check CHECK (((priority)::text = ANY ((ARRAY['low'::character varying, 'medium'::character varying, 'high'::character varying, 'urgent'::character varying])::text[]))),
    CONSTRAINT notifications_status_check CHECK (((status)::text = ANY ((ARRAY['unread'::character varying, 'read'::character varying, 'archived'::character varying])::text[])))
);


ALTER TABLE public.notifications OWNER TO postgres;

--
-- Name: notifications_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.notifications_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.notifications_id_seq OWNER TO postgres;

--
-- Name: notifications_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.notifications_id_seq OWNED BY public.notifications.id;


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
    image text,
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
    sales_back_yen numeric(12,2) DEFAULT 0.00,
    together_nomination_cost numeric(12,2) DEFAULT 0.00,
    together_nomination_count integer DEFAULT 0,
    together_nomination_fee numeric(12,2) DEFAULT 0.00,
    overtime_wage_yen numeric(12,2) DEFAULT 0.00,
    deduction_yen numeric(12,2) DEFAULT 0.00,
    total_pay_yen numeric(12,2) DEFAULT 0.00,
    paid_price numeric(12,2) DEFAULT 0.00,
    realtotal_price numeric(12,2) DEFAULT 0.00,
    created_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
    updated_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
    pickup_yen numeric(12,2) DEFAULT 0.00,
    hairmake_yen numeric(12,2) DEFAULT 0.00,
    rental_yen numeric(12,2) DEFAULT 0.00,
    other_deduct_yen numeric(12,2) DEFAULT 0.00,
    penalty_yen numeric(12,2) DEFAULT 0.00,
    bonus_yen numeric(12,2) DEFAULT 0.00,
    point_yen numeric(12,2) DEFAULT 0.00,
    additional_point_yen numeric(12,2) DEFAULT 0.00,
    CONSTRAINT salary_base_pay_check CHECK ((base_pay >= (0)::numeric)),
    CONSTRAINT salary_basic_hours_check CHECK ((basic_hours >= (0)::numeric)),
    CONSTRAINT salary_inside_nomination_count_check CHECK ((inside_nomination_count >= 0)),
    CONSTRAINT salary_inside_nomination_fee_check CHECK ((inside_nomination_fee >= (0)::numeric)),
    CONSTRAINT salary_main_nomination_count_check CHECK ((main_nomination_count >= 0)),
    CONSTRAINT salary_main_nomination_fee_check CHECK ((main_nomination_fee >= (0)::numeric)),
    CONSTRAINT salary_month_check CHECK (((month >= 1) AND (month <= 12))),
    CONSTRAINT salary_overtime_wage_yen_check CHECK ((overtime_wage_yen >= (0)::numeric)),
    CONSTRAINT salary_paid_price_check CHECK ((paid_price >= (0)::numeric)),
    CONSTRAINT salary_sales_back_yen_check CHECK ((sales_back_yen >= (0)::numeric)),
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
-- Name: salary_daily; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.salary_daily (
    id integer NOT NULL,
    date date NOT NULL,
    user_id integer NOT NULL,
    basic_hours numeric(10,2) DEFAULT 0.00,
    paid_price numeric(12,2) DEFAULT 0.00,
    pickup_yen numeric(12,2) DEFAULT 0.00,
    hairmake_yen numeric(12,2) DEFAULT 0.00,
    rental_yen numeric(12,2) DEFAULT 0.00,
    other_deduct_yen numeric(12,2) DEFAULT 0.00,
    penalty_yen numeric(12,2) DEFAULT 0.00,
    deduction_yen numeric(12,2) DEFAULT 0.00,
    hourly_price numeric(10,2) DEFAULT 0.00,
    base_pay numeric(12,2) DEFAULT 0.00,
    main_nomination_count integer DEFAULT 0,
    main_nomination_fee numeric(12,2) DEFAULT 0.00,
    main_nomination_extension_count integer DEFAULT 0,
    main_nomination_extension_fee numeric(12,2) DEFAULT 0.00,
    inside_nomination_count integer DEFAULT 0,
    inside_nomination_fee numeric(12,2) DEFAULT 0.00,
    inside_nomination_extension_count integer DEFAULT 0,
    inside_nomination_extension_fee numeric(12,2) DEFAULT 0.00,
    together_nomination_count integer DEFAULT 0,
    together_nomination_fee numeric(12,2) DEFAULT 0.00,
    category_totals jsonb DEFAULT '{}'::jsonb,
    bonus_yen numeric(12,2) DEFAULT 0.00,
    point_yen numeric(12,2) DEFAULT 0.00,
    additional_point_yen numeric(12,2) DEFAULT 0.00,
    back_total numeric(12,2) DEFAULT 0.00,
    total_pay_yen numeric(12,2) DEFAULT 0.00,
    realtotal_price numeric(12,2) DEFAULT 0.00,
    created_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
    updated_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT salary_daily_additional_point_yen_check CHECK ((additional_point_yen >= (0)::numeric)),
    CONSTRAINT salary_daily_back_total_check CHECK ((back_total >= (0)::numeric)),
    CONSTRAINT salary_daily_base_pay_check CHECK ((base_pay >= (0)::numeric)),
    CONSTRAINT salary_daily_basic_hours_check CHECK ((basic_hours >= (0)::numeric)),
    CONSTRAINT salary_daily_bonus_yen_check CHECK ((bonus_yen >= (0)::numeric)),
    CONSTRAINT salary_daily_hairmake_yen_check CHECK ((hairmake_yen >= (0)::numeric)),
    CONSTRAINT salary_daily_hourly_price_check CHECK ((hourly_price >= (0)::numeric)),
    CONSTRAINT salary_daily_inside_nomination_count_check CHECK ((inside_nomination_count >= 0)),
    CONSTRAINT salary_daily_inside_nomination_extension_count_check CHECK ((inside_nomination_extension_count >= 0)),
    CONSTRAINT salary_daily_inside_nomination_extension_fee_check CHECK ((inside_nomination_extension_fee >= (0)::numeric)),
    CONSTRAINT salary_daily_inside_nomination_fee_check CHECK ((inside_nomination_fee >= (0)::numeric)),
    CONSTRAINT salary_daily_main_nomination_count_check CHECK ((main_nomination_count >= 0)),
    CONSTRAINT salary_daily_main_nomination_extension_count_check CHECK ((main_nomination_extension_count >= 0)),
    CONSTRAINT salary_daily_main_nomination_extension_fee_check CHECK ((main_nomination_extension_fee >= (0)::numeric)),
    CONSTRAINT salary_daily_main_nomination_fee_check CHECK ((main_nomination_fee >= (0)::numeric)),
    CONSTRAINT salary_daily_other_deduct_yen_check CHECK ((other_deduct_yen >= (0)::numeric)),
    CONSTRAINT salary_daily_paid_price_check CHECK ((paid_price >= (0)::numeric)),
    CONSTRAINT salary_daily_penalty_yen_check CHECK ((penalty_yen >= (0)::numeric)),
    CONSTRAINT salary_daily_pickup_yen_check CHECK ((pickup_yen >= (0)::numeric)),
    CONSTRAINT salary_daily_point_yen_check CHECK ((point_yen >= (0)::numeric)),
    CONSTRAINT salary_daily_rental_yen_check CHECK ((rental_yen >= (0)::numeric)),
    CONSTRAINT salary_daily_together_nomination_count_check CHECK ((together_nomination_count >= 0)),
    CONSTRAINT salary_daily_together_nomination_fee_check CHECK ((together_nomination_fee >= (0)::numeric))
);


ALTER TABLE public.salary_daily OWNER TO postgres;

--
-- Name: salary_daily_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.salary_daily_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.salary_daily_id_seq OWNER TO postgres;

--
-- Name: salary_daily_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.salary_daily_id_seq OWNED BY public.salary_daily.id;


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
    castsalary_price numeric(12,2) DEFAULT 0.00,
    for_cast integer DEFAULT 0,
    status character varying(20) DEFAULT 'pending'::character varying,
    accepted_at timestamp with time zone,
    accepted_by integer,
    created_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
    updated_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT salesorder_amount_check CHECK ((amount > 0)),
    CONSTRAINT salesorder_castsalary_price_check CHECK ((castsalary_price >= (0)::numeric)),
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
-- Name: session_item_overrides; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.session_item_overrides (
    id integer NOT NULL,
    session_id integer NOT NULL,
    item_key text NOT NULL,
    unit_price numeric(12,2),
    quantity integer,
    total numeric(12,2),
    created_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
    updated_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP
);


ALTER TABLE public.session_item_overrides OWNER TO postgres;

--
-- Name: session_item_overrides_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.session_item_overrides_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.session_item_overrides_id_seq OWNER TO postgres;

--
-- Name: session_item_overrides_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.session_item_overrides_id_seq OWNED BY public.session_item_overrides.id;


--
-- Name: session_payments; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.session_payments (
    id integer NOT NULL,
    session_id integer NOT NULL,
    pay_type integer NOT NULL,
    amount numeric(12,2) NOT NULL,
    other text,
    created_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
    updated_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT session_payments_amount_check CHECK ((amount >= (0)::numeric)),
    CONSTRAINT session_payments_pay_type_check CHECK ((pay_type = ANY (ARRAY[0, 1, 2])))
);


ALTER TABLE public.session_payments OWNER TO postgres;

--
-- Name: session_payments_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.session_payments_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.session_payments_id_seq OWNER TO postgres;

--
-- Name: session_payments_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.session_payments_id_seq OWNED BY public.session_payments.id;


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
    is_paused boolean DEFAULT false,
    paused_at timestamp with time zone,
    paused_elapsed integer DEFAULT 0,
    pay_type integer,
    created_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
    updated_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT sessions_cost_check CHECK ((cost >= (0)::numeric)),
    CONSTRAINT sessions_pay_type_check CHECK ((pay_type = ANY (ARRAY[0, 1, 2]))),
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
-- Name: song_room; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.song_room (
    id integer NOT NULL,
    name character varying(200) NOT NULL,
    status smallint DEFAULT 0 NOT NULL,
    other text,
    session_id integer,
    created_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
    updated_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT song_room_status_check CHECK ((status = ANY (ARRAY[0, 1])))
);


ALTER TABLE public.song_room OWNER TO postgres;

--
-- Name: song_room_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.song_room_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.song_room_id_seq OWNER TO postgres;

--
-- Name: song_room_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.song_room_id_seq OWNED BY public.song_room.id;


--
-- Name: table; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public."table" (
    id integer NOT NULL,
    name character varying(100) NOT NULL,
    capacity integer,
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
    together_nomination numeric(5,2) DEFAULT 0.00,
    hourly_price numeric(10,2) DEFAULT 0.00,
    other text,
    attendance_status integer DEFAULT 0,
    created_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
    updated_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
    gender character varying(10),
    CONSTRAINT user_drink_back_check CHECK (((drink_back >= (0)::numeric) AND (drink_back <= (100)::numeric))),
    CONSTRAINT user_food_back_check CHECK (((food_back >= (0)::numeric) AND (food_back <= (100)::numeric))),
    CONSTRAINT user_hourly_price_check CHECK ((hourly_price >= (0)::numeric)),
    CONSTRAINT user_inside_nomination_check CHECK (((inside_nomination >= (0)::numeric) AND (inside_nomination <= (100)::numeric))),
    CONSTRAINT user_main_nomination_check CHECK (((main_nomination >= (0)::numeric) AND (main_nomination <= (100)::numeric))),
    CONSTRAINT user_role_check CHECK (((role)::text = ANY ((ARRAY['admin'::character varying, 'cast'::character varying, 'manager'::character varying, 'super_admin'::character varying, 'table'::character varying])::text[]))),
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
-- Name: vip_room; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.vip_room (
    id integer NOT NULL,
    name character varying(200) NOT NULL,
    status smallint DEFAULT 0 NOT NULL,
    other text,
    session_id integer,
    created_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
    updated_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
    price numeric(10,2) DEFAULT 0.00 NOT NULL,
    CONSTRAINT vip_room_price_check CHECK ((price >= (0)::numeric)),
    CONSTRAINT vip_room_status_check CHECK ((status = ANY (ARRAY[0, 1])))
);


ALTER TABLE public.vip_room OWNER TO postgres;

--
-- Name: vip_room_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.vip_room_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.vip_room_id_seq OWNER TO postgres;

--
-- Name: vip_room_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.vip_room_id_seq OWNED BY public.vip_room.id;


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
-- Name: deduct id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.deduct ALTER COLUMN id SET DEFAULT nextval('public.deduct_id_seq'::regclass);


--
-- Name: nomination id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.nomination ALTER COLUMN id SET DEFAULT nextval('public.nomination_id_seq'::regclass);


--
-- Name: notifications id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.notifications ALTER COLUMN id SET DEFAULT nextval('public.notifications_id_seq'::regclass);


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
-- Name: salary_daily id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.salary_daily ALTER COLUMN id SET DEFAULT nextval('public.salary_daily_id_seq'::regclass);


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
-- Name: session_item_overrides id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.session_item_overrides ALTER COLUMN id SET DEFAULT nextval('public.session_item_overrides_id_seq'::regclass);


--
-- Name: session_payments id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.session_payments ALTER COLUMN id SET DEFAULT nextval('public.session_payments_id_seq'::regclass);


--
-- Name: sessions id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.sessions ALTER COLUMN id SET DEFAULT nextval('public.sessions_id_seq'::regclass);


--
-- Name: shift id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.shift ALTER COLUMN id SET DEFAULT nextval('public.shift_id_seq'::regclass);


--
-- Name: song_room id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.song_room ALTER COLUMN id SET DEFAULT nextval('public.song_room_id_seq'::regclass);


--
-- Name: table id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public."table" ALTER COLUMN id SET DEFAULT nextval('public.table_id_seq'::regclass);


--
-- Name: user id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public."user" ALTER COLUMN id SET DEFAULT nextval('public.user_id_seq'::regclass);


--
-- Name: vip_room id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.vip_room ALTER COLUMN id SET DEFAULT nextval('public.vip_room_id_seq'::regclass);


--
-- Data for Name: add_charges; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.add_charges (id, charge_name, value, other, created_at, updated_at) FROM stdin;
1	main	3000.00		2026-02-25 17:12:42.227847+09	2026-02-26 13:25:28.965677+09
2	inside	1500.00		2026-02-25 17:12:42.227847+09	2026-02-26 13:25:40.550194+09
3	together	5000.00		2026-02-25 17:12:42.227847+09	2026-02-26 13:25:46.685094+09
4	bottle_keep	1000.00		2026-02-25 17:12:42.227847+09	2026-02-26 13:25:56.380645+09
5	vip_room	2000.00		2026-02-25 17:12:42.227847+09	2026-02-26 13:26:34.382734+09
6	song_room	500.00		2026-02-25 17:12:42.227847+09	2026-02-26 13:26:45.806319+09
13	set_price	3000.00		2026-02-26 09:04:29.665798+09	2026-02-26 13:28:55.79081+09
14	extension_price	3000.00		2026-02-26 09:04:29.665798+09	2026-02-26 13:29:13.278399+09
399	standard_date	5.00	\N	2026-02-28 00:45:45.222229+09	2026-02-28 00:45:45.222229+09
400	regular	1900.00	\N	2026-02-28 00:45:45.223387+09	2026-02-28 00:45:45.223387+09
401	arubaito	1700.00	\N	2026-02-28 00:45:45.223851+09	2026-02-28 00:45:45.223851+09
\.


--
-- Data for Name: additional_services; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.additional_services (id, session_id, service_type, count, charge, created_at, updated_at, note) FROM stdin;
1	22	vip_room	3	6000.00	2026-05-04 22:03:22.56313+09	2026-05-04 22:03:22.56313+09	\N
2	24	vip_room	1	2000.00	2026-05-05 02:01:26.974041+09	2026-05-05 02:01:26.974041+09	VIP-B
3	24	vip_room	1	2000.00	2026-05-05 02:15:19.940893+09	2026-05-05 02:15:19.940893+09	セット延長
4	25	vip_room	1	2000.00	2026-05-05 02:22:38.719174+09	2026-05-05 02:22:38.719174+09	VIP-A
5	25	vip_room	1	2000.00	2026-05-05 02:23:56.886323+09	2026-05-05 02:23:56.886323+09	セット延長
6	38	vip_room	1	2000.00	2026-05-06 10:07:51.812106+09	2026-05-06 10:07:51.812106+09	VIP-B
7	38	vip_room	1	2000.00	2026-05-06 10:08:12.918132+09	2026-05-06 10:08:12.918132+09	セット延長
8	39	vip_room	1	2000.00	2026-05-06 10:41:17.245942+09	2026-05-06 10:41:17.245942+09	VIP-C
9	39	karaoke	1	500.00	2026-05-06 10:41:23.377323+09	2026-05-06 10:41:23.377323+09	Song-A
16	39	vip_room	1	2000.00	2026-05-06 10:44:29.746685+09	2026-05-06 10:44:29.746685+09	セット延長
17	39	karaoke	1	500.00	2026-05-06 10:44:29.961996+09	2026-05-06 10:44:29.961996+09	セット延長
18	42	vip_room	1	2000.00	2026-05-06 15:51:12.415272+09	2026-05-06 15:51:12.415272+09	VIP-B
19	42	karaoke	1	500.00	2026-05-06 15:51:16.961428+09	2026-05-06 15:51:16.961428+09	Song-B
20	42	vip_room	1	2000.00	2026-05-06 15:51:21.866139+09	2026-05-06 15:51:21.866139+09	セット延長
21	42	karaoke	1	500.00	2026-05-06 15:51:22.162614+09	2026-05-06 15:51:22.162614+09	セット延長
22	42	vip_room	1	2000.00	2026-05-06 15:51:40.167939+09	2026-05-06 15:51:40.167939+09	セット延長
23	42	karaoke	1	500.00	2026-05-06 15:51:40.44382+09	2026-05-06 15:51:40.44382+09	セット延長
24	43	vip_room	1	2000.00	2026-05-06 16:05:00.311935+09	2026-05-06 16:05:00.311935+09	VIP-A
25	43	karaoke	1	500.00	2026-05-06 16:05:05.497236+09	2026-05-06 16:05:05.497236+09	Song-A
32	44	vip_room	1	2000.00	2026-05-06 16:16:12.796877+09	2026-05-06 16:16:12.796877+09	VIP-B
33	44	karaoke	1	500.00	2026-05-06 16:16:17.541167+09	2026-05-06 16:16:17.541167+09	Song-B
40	44	karaoke	1	500.00	2026-05-06 16:20:08.389544+09	2026-05-06 16:20:08.389544+09	セット延長
41	44	vip_room	1	2000.00	2026-05-06 16:20:35.173533+09	2026-05-06 16:20:35.173533+09	セット延長
42	44	karaoke	1	500.00	2026-05-06 16:20:35.20839+09	2026-05-06 16:20:35.20839+09	セット延長
43	44	vip_room	1	2000.00	2026-05-06 16:21:39.381131+09	2026-05-06 16:21:39.381131+09	セット延長
44	44	karaoke	1	500.00	2026-05-06 16:21:39.421068+09	2026-05-06 16:21:39.421068+09	セット延長
45	45	vip_room	1	2000.00	2026-05-06 16:26:50.809772+09	2026-05-06 16:26:50.809772+09	VIP-B
46	45	karaoke	1	500.00	2026-05-06 16:26:59.537026+09	2026-05-06 16:26:59.537026+09	Song-B
47	45	vip_room	1	2000.00	2026-05-06 16:27:05.48208+09	2026-05-06 16:27:05.48208+09	セット延長
48	45	karaoke	1	500.00	2026-05-06 16:27:05.780275+09	2026-05-06 16:27:05.780275+09	セット延長
49	45	vip_room	1	2000.00	2026-05-06 16:27:22.507392+09	2026-05-06 16:27:22.507392+09	セット延長
50	45	karaoke	1	500.00	2026-05-06 16:27:22.594586+09	2026-05-06 16:27:22.594586+09	セット延長
51	45	vip_room	1	2000.00	2026-05-06 16:33:54.549181+09	2026-05-06 16:33:54.549181+09	セット延長
52	45	karaoke	1	500.00	2026-05-06 16:33:54.714235+09	2026-05-06 16:33:54.714235+09	セット延長
53	46	vip_room	1	2000.00	2026-05-06 16:50:45.831898+09	2026-05-06 16:50:45.831898+09	VIP-C
54	46	karaoke	1	500.00	2026-05-06 16:50:51.095546+09	2026-05-06 16:50:51.095546+09	Song-B
61	47	vip_room	1	2000.00	2026-05-06 17:06:14.794919+09	2026-05-06 17:06:14.794919+09	VIP-B
62	47	karaoke	1	500.00	2026-05-06 17:06:19.770366+09	2026-05-06 17:06:19.770366+09	Song-B
63	47	vip_room	1	2000.00	2026-05-06 17:31:26.764984+09	2026-05-06 17:31:26.764984+09	セット延長
64	47	karaoke	1	500.00	2026-05-06 17:31:27.110164+09	2026-05-06 17:31:27.110164+09	セット延長
65	47	vip_room	1	2000.00	2026-05-06 17:31:27.122005+09	2026-05-06 17:31:27.122005+09	セット延長
66	47	karaoke	1	500.00	2026-05-06 17:31:27.247922+09	2026-05-06 17:31:27.247922+09	セット延長
67	47	vip_room	1	2000.00	2026-05-06 17:31:45.991469+09	2026-05-06 17:31:45.991469+09	セット延長
68	47	karaoke	1	500.00	2026-05-06 17:31:46.381322+09	2026-05-06 17:31:46.381322+09	セット延長
69	47	vip_room	1	2000.00	2026-05-06 17:33:27.903018+09	2026-05-06 17:33:27.903018+09	セット延長
70	47	karaoke	1	500.00	2026-05-06 17:33:28.265413+09	2026-05-06 17:33:28.265413+09	セット延長
71	58	vip_room	1	2100.00	2026-05-14 01:58:31.833122+09	2026-05-14 01:58:31.833122+09	VIP-B
72	58	vip_room	1	3600.00	2026-05-14 01:58:48.229486+09	2026-05-14 01:58:48.229486+09	VIP-C
\.


--
-- Data for Name: attendance; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.attendance (id, staff_id, clock_in, clock_out, total_work_hours, comment, detailed_times, status, approved_by, approved_at, created_at, updated_at) FROM stdin;
4	5	2026-05-05 10:09:45.585+09	2026-05-05 10:09:00+09	-0.01	\N	\N	saved	2	2026-05-05 10:09:51.104682+09	2026-05-05 10:09:45.593936+09	2026-05-05 10:09:51.104682+09
6	7	2026-05-05 10:30:00+09	2026-05-05 10:38:00+09	0.13	\N	\N	saved	2	2026-05-05 10:38:23.282721+09	2026-05-05 10:37:17.537038+09	2026-05-05 10:38:23.282721+09
5	4	2026-05-05 10:30:00+09	2026-05-05 10:38:00+09	0.13	\N	\N	saved	2	2026-05-05 10:38:25.960453+09	2026-05-05 10:35:26.740029+09	2026-05-05 10:38:25.960453+09
7	4	2026-05-05 10:45:00+09	2026-05-05 10:45:00+09	0.00	\N	\N	saved	2	2026-05-05 10:45:51.562159+09	2026-05-05 10:38:37.842851+09	2026-05-05 10:45:51.562159+09
8	7	2026-05-05 10:45:00+09	2026-05-05 10:45:00+09	0.00	\N	\N	saved	2	2026-05-05 10:45:53.452285+09	2026-05-05 10:43:25.428974+09	2026-05-05 10:45:53.452285+09
9	4	2026-05-05 10:45:00+09	2026-05-05 10:46:00+09	0.02	\N	\N	saved	2	2026-05-05 10:46:28.850439+09	2026-05-05 10:46:25.881744+09	2026-05-05 10:46:28.850439+09
17	6	2026-05-06 10:45:00+09	2026-05-06 10:56:00+09	0.18	\N	\N	saved	2	2026-05-06 10:56:16.653963+09	2026-05-06 10:49:29.968143+09	2026-05-06 10:56:16.653963+09
18	6	2026-05-06 11:00:00+09	2026-05-06 11:11:00+09	0.18	\N	\N	saved	2	2026-05-06 11:11:12.213813+09	2026-05-06 11:03:39.762864+09	2026-05-06 11:11:12.213813+09
16	5	2026-05-06 10:45:00+09	2026-05-06 21:57:00+09	11.20	\N	\N	saved	2	2026-05-06 21:57:56.496998+09	2026-05-06 10:49:25.992776+09	2026-05-06 21:57:56.496998+09
20	5	2026-05-06 22:00:00+09	2026-05-06 21:59:00+09	-0.02	\N	\N	saved	2	2026-05-06 22:00:01.738194+09	2026-05-06 21:59:13.575778+09	2026-05-06 22:00:01.738194+09
23	4	2026-05-07 08:48:00+09	2026-05-07 08:48:00+09	0.00	\N	\N	saved	2	2026-05-07 08:48:30.077246+09	2026-05-07 08:48:05.577026+09	2026-05-07 08:48:30.077246+09
24	4	2026-05-07 08:49:00+09	2026-05-07 09:08:00+09	0.32	\N	\N	saved	2	2026-05-07 09:08:26.396046+09	2026-05-07 08:49:19.555259+09	2026-05-07 09:08:26.396046+09
25	4	2026-05-07 12:02:00+09	\N	\N	\N	\N	pending	\N	\N	2026-05-07 12:02:36.087102+09	2026-05-07 12:02:36.087102+09
26	7	2026-05-12 13:13:00+09	2026-05-12 13:14:00+09	0.02	\N	\N	saved	2	2026-05-12 13:14:46.312651+09	2026-05-12 13:13:11.850759+09	2026-05-12 13:14:46.312651+09
27	15	2026-05-12 13:13:00+09	2026-05-12 13:14:00+09	0.02	\N	\N	saved	2	2026-05-12 13:14:50.217185+09	2026-05-12 13:13:17.967912+09	2026-05-12 13:14:50.217185+09
29	19	2026-05-12 13:13:00+09	2026-05-12 13:15:00+09	0.03	\N	\N	saved	2	2026-05-12 13:15:06.242191+09	2026-05-12 13:13:23.360334+09	2026-05-12 13:15:06.242191+09
28	17	2026-05-12 13:13:00+09	2026-05-12 13:15:00+09	0.03	\N	\N	saved	2	2026-05-12 13:15:09.722461+09	2026-05-12 13:13:21.028732+09	2026-05-12 13:15:09.722461+09
21	3	2026-05-06 23:43:00+09	2026-05-12 13:17:00+09	133.57	\N	\N	saved	2	2026-05-12 13:17:56.646191+09	2026-05-06 23:43:59.354458+09	2026-05-12 13:17:56.646191+09
30	3	2026-05-12 13:18:00+09	2026-05-12 13:19:00+09	0.02	\N	\N	saved	2	2026-05-12 13:19:03.356392+09	2026-05-12 13:18:26.3296+09	2026-05-12 13:19:03.356392+09
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

COPY public.category (id, name, image, other, created_at, updated_at) FROM stdin;
1	ショット	\N		2026-02-26 13:35:06.26798+09	2026-02-26 13:35:06.26798+09
2	カクテル	\N		2026-02-26 13:35:16.79899+09	2026-02-26 13:35:16.79899+09
3	ドリンク	\N		2026-02-26 13:35:23.299402+09	2026-02-26 13:35:23.299402+09
4	フード	\N		2026-02-26 13:35:28.547665+09	2026-02-26 13:35:28.547665+09
5	セット	\N		2026-02-26 13:35:34.355493+09	2026-02-26 13:35:34.355493+09
\.


--
-- Data for Name: deduct; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.deduct (id, date, value, reason, other, created_at, updated_at) FROM stdin;
1	2026-03-04	656.00			2026-03-04 11:33:32.936078+09	2026-03-04 11:33:32.936078+09
3	2026-09-09	200002.00			2026-03-04 12:09:30.06714+09	2026-03-04 12:09:30.06714+09
4	2026-03-06	4.00	33	r	2026-03-06 09:13:10.658505+09	2026-03-06 09:13:24.429714+09
\.


--
-- Data for Name: nomination; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.nomination (id, cast_id, table_id, session_id, type_id, cost, cost_cast, tomain_nomination, rank_cost, rank_point, created_at, updated_at, initial_nomination_cost) FROM stdin;
1	6	2	5	main	0.00	0.00	0	0.00	1.00	2026-02-26 12:57:47.630616+09	2026-02-26 12:57:47.630616+09	\N
2	3	1	6	main	3000.00	900.00	0	7200.00	1.00	2026-02-28 01:09:20.69287+09	2026-02-28 01:38:06.343203+09	\N
3	6	2	7	main	3000.00	900.00	0	9000.00	2.00	2026-03-03 02:46:38.365002+09	2026-03-03 02:46:38.365002+09	\N
4	3	2	8	main	6000.00	1800.00	0	12000.00	2.00	2026-03-03 03:00:28.610087+09	2026-03-03 03:01:53.442164+09	\N
5	7	2	8	inside	1500.00	600.00	0	0.00	0.50	2026-03-03 03:02:08.529545+09	2026-03-03 03:02:08.529545+09	\N
47	6	1	47	inside	13500.00	4200.00	1	24000.00	4.50	2026-05-06 17:06:01.160635+09	2026-05-06 17:33:28.289923+09	1500.00
7	3	3	9	inside	7500.00	2400.00	1	12000.00	2.50	2026-03-03 03:46:06.736924+09	2026-03-03 03:47:35.358326+09	\N
6	6	3	9	main	9000.00	2700.00	0	18000.00	3.00	2026-03-03 03:46:03.424609+09	2026-03-03 03:47:35.373019+09	\N
8	7	3	9	together	8000.00	2400.00	0	20000.00	3.00	2026-03-03 03:47:51.283967+09	2026-03-03 03:47:51.283967+09	\N
10	6	2	10	together	11000.00	3300.00	0	14000.00	2.00	2026-03-03 03:49:12.130337+09	2026-03-03 03:49:52.548018+09	\N
9	7	2	10	inside	4500.00	1500.00	1	6000.00	1.50	2026-03-03 03:49:03.151699+09	2026-03-03 03:49:52.562197+09	\N
11	7	3	11	inside	4500.00	1500.00	1	6000.00	1.50	2026-03-03 03:51:45.819725+09	2026-03-03 03:51:56.135413+09	\N
46	5	1	47	main	15000.00	4500.00	0	30000.00	5.00	2026-05-06 17:05:55.77826+09	2026-05-06 17:33:28.316651+09	3000.00
13	3	2	12	together	14000.00	4200.00	0	20000.00	3.00	2026-03-03 09:05:41.115114+09	2026-03-03 09:06:24.884432+09	\N
12	6	2	12	main	9000.00	2700.00	0	18000.00	3.00	2026-03-03 09:05:37.932748+09	2026-03-03 09:06:24.899035+09	\N
41	3	2	44	together	23000.00	6900.00	0	44000.00	7.00	2026-05-06 16:16:02.724528+09	2026-05-06 16:21:39.248912+09	5000.00
40	6	2	44	inside	19500.00	6000.00	1	36000.00	6.50	2026-05-06 16:15:46.127745+09	2026-05-06 16:21:39.265617+09	1500.00
16	7	4	14	inside	4500.00	1500.00	1	6000.00	1.50	2026-03-05 01:46:59.452316+09	2026-03-05 01:47:14.268951+09	\N
15	6	4	14	together	14000.00	4200.00	0	20000.00	3.00	2026-03-05 01:46:09.798894+09	2026-03-05 01:47:14.288252+09	\N
14	3	4	14	main	9000.00	2700.00	0	18000.00	3.00	2026-03-05 01:46:06.332896+09	2026-03-05 01:47:14.302648+09	\N
39	5	2	44	main	21000.00	6300.00	0	42000.00	7.00	2026-05-06 16:15:38.693644+09	2026-05-06 16:21:39.286959+09	3000.00
48	4	1	48	together	8000.00	2400.00	0	14000.00	2.00	2026-05-07 20:59:55.520059+09	2026-05-07 21:00:05.285446+09	5000.00
38	3	3	43	together	14000.00	4200.00	0	26000.00	4.00	2026-05-06 16:03:36.492336+09	2026-05-06 16:07:05.40099+09	5000.00
20	6	1	15	together	14000.00	4200.00	0	26000.00	4.00	2026-03-05 09:16:07.555744+09	2026-03-05 09:20:37.768261+09	\N
19	7	1	15	together	17000.00	5100.00	0	26000.00	4.00	2026-03-05 09:00:01.117144+09	2026-03-05 09:20:37.783305+09	\N
17	3	1	15	inside	10500.00	3300.00	1	18000.00	3.50	2026-03-05 08:58:53.782201+09	2026-03-05 09:20:37.796636+09	\N
21	3	6	34	together	8000.00	2400.00	0	8000.00	1.00	2026-05-05 23:54:10.747504+09	2026-05-05 23:54:10.747504+09	\N
22	3	1	35	together	8000.00	2400.00	0	14000.00	2.00	2026-05-06 00:03:23.598587+09	2026-05-06 00:03:53.993937+09	\N
23	3	2	36	main	6000.00	1800.00	0	12000.00	2.00	2026-05-06 09:29:04.333157+09	2026-05-06 09:29:50.415948+09	\N
36	6	3	43	inside	10500.00	3300.00	1	18000.00	3.50	2026-05-06 16:03:07.813224+09	2026-05-06 16:07:05.561595+09	1500.00
35	5	3	43	main	12000.00	3600.00	0	24000.00	4.00	2026-05-06 16:03:03.053642+09	2026-05-06 16:07:05.573846+09	3000.00
49	3	1	49	together	8000.00	2400.00	0	14000.00	2.00	2026-05-11 23:29:05.680796+09	2026-05-11 23:31:13.627675+09	5000.00
25	3	2	39	inside	19500.00	6000.00	1	36000.00	6.50	2026-05-06 10:39:58.72646+09	2026-05-06 10:44:30.208066+09	\N
43	6	2	45	inside	10500.00	3300.00	1	18000.00	3.50	2026-05-06 16:26:42.371474+09	2026-05-06 16:33:54.737292+09	1500.00
42	5	2	45	main	12000.00	3600.00	0	24000.00	4.00	2026-05-06 16:26:38.534813+09	2026-05-06 16:33:54.818488+09	3000.00
28	6	2	40	together	17000.00	5100.00	0	32000.00	5.00	2026-05-06 11:03:51.454142+09	2026-05-06 11:26:20.966367+09	\N
27	3	2	40	inside	13500.00	4200.00	1	24000.00	4.50	2026-05-06 11:03:34.589139+09	2026-05-06 11:26:21.244905+09	\N
26	5	2	40	main	15000.00	4500.00	0	30000.00	5.00	2026-05-06 11:03:30.006395+09	2026-05-06 11:26:21.260441+09	\N
50	3	1	50	together	8000.00	3300.00	0	17000.00	2.00	2026-05-12 00:43:22.86268+09	2026-05-12 00:44:09.958458+09	5000.00
51	4	1	56	inside	1500.00	600.00	0	0.00	0.50	2026-05-13 22:15:23.486811+09	2026-05-13 22:15:23.486811+09	1500.00
45	6	2	46	inside	10500.00	3300.00	1	18000.00	3.50	2026-05-06 16:50:38.519233+09	2026-05-06 16:51:08.41914+09	1500.00
44	5	2	46	main	12000.00	3600.00	0	24000.00	4.00	2026-05-06 16:50:34.534377+09	2026-05-06 16:51:08.445403+09	3000.00
34	6	2	42	together	35000.00	10500.00	0	68000.00	11.00	2026-05-06 12:02:44.165947+09	2026-05-06 15:51:40.580433+09	5000.00
33	5	2	42	inside	31500.00	9600.00	1	60000.00	10.50	2026-05-06 12:02:15.338066+09	2026-05-06 15:51:40.906324+09	1500.00
32	3	2	42	main	33000.00	9900.00	0	66000.00	11.00	2026-05-06 12:02:09.582493+09	2026-05-06 15:51:40.919263+09	3000.00
\.


--
-- Data for Name: notifications; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.notifications (id, type, table_id, table_label, cast_name, message, priority, status, created_at, updated_at) FROM stdin;
1	sales_order	1	テーブル1	未選択	ジントニック x2 の注文が入りました	high	unread	2026-02-28 01:08:51.448526+09	2026-02-28 01:08:51.448526+09
2	sales_order	1	テーブル1	hana	ウォッカショット x2 の注文が入りました	high	unread	2026-02-28 01:08:59.529213+09	2026-02-28 01:08:59.529213+09
3	sales_order	1	テーブル1	hana	クランベリージュース x2 の注文が入りました	high	unread	2026-02-28 01:09:10.586392+09	2026-02-28 01:09:10.586392+09
4	sales_order	2	テーブル2	未選択	モヒート x1 の注文が入りました	high	unread	2026-03-04 22:08:48.214681+09	2026-03-04 22:08:48.214681+09
5	sales_order	2	テーブル2	未選択	ウォッカショット x1 の注文が入りました	high	unread	2026-03-04 22:09:10.374046+09	2026-03-04 22:09:10.374046+09
6	sales_order	4	テーブル4	未選択	イエガーボム x2 の注文が入りました	high	unread	2026-03-05 01:45:59.568631+09	2026-03-05 01:45:59.568631+09
7	sales_order	1	テーブル1	hana	マルガリータ x2 の注文が入りました	high	unread	2026-03-05 08:58:39.027421+09	2026-03-05 08:58:39.027421+09
8	sales_order	1	テーブル1	未選択	テキーラショット x4 の注文が入りました	high	unread	2026-03-05 08:58:44.591752+09	2026-03-05 08:58:44.591752+09
9	sales_order	1	テーブル1	未選択	アイスティー x1 の注文が入りました	high	unread	2026-03-05 08:58:48.00669+09	2026-03-05 08:58:48.00669+09
10	sales_order	2	テーブル2	未選択	ジントニック x1 の注文が入りました	high	unread	2026-05-01 18:13:05.951009+09	2026-05-01 18:13:05.951009+09
11	sales_order	2	テーブル2	hana	モヒート x2 の注文が入りました	high	unread	2026-05-04 17:24:15.259194+09	2026-05-04 17:24:15.259194+09
12	sales_order	1	テーブル1	未選択	チキンナゲット x1 の注文が入りました	high	unread	2026-05-05 16:47:24.733314+09	2026-05-05 16:47:24.733314+09
13	sales_order	1	テーブル1	未選択	ウォッカショット x2 の注文が入りました	high	unread	2026-05-13 09:05:12.63083+09	2026-05-13 09:05:12.63083+09
14	sales_order	1	テーブル1	未選択	ジャックダニエルショット x1 の注文が入りました	high	unread	2026-05-13 09:06:11.036179+09	2026-05-13 09:06:11.036179+09
15	sales_order	1	テーブル1	未選択	カクテル飲み比べセット x2 の注文が入りました	high	unread	2026-05-13 09:06:29.469839+09	2026-05-13 09:06:29.469839+09
16	sales_order	1	テーブル1	未選択	マルガリータ x1 の注文が入りました	high	unread	2026-05-13 15:25:27.23152+09	2026-05-13 15:25:27.23152+09
17	sales_order	1	テーブル1	未選択	イエガーボム x1 の注文が入りました	high	unread	2026-05-13 15:25:30.244817+09	2026-05-13 15:25:30.244817+09
18	sales_order	1	テーブル1	hiro	ジャックダニエルショット x1 の注文が入りました	high	unread	2026-05-13 16:06:56.398445+09	2026-05-13 16:06:56.398445+09
19	sales_order	1	テーブル1	hiro	おつまみ盛り合わせセット x4 の注文が入りました	high	unread	2026-05-13 16:07:18.099889+09	2026-05-13 16:07:18.099889+09
20	sales_order	1	テーブル1	hiro	おつまみ盛り合わせセット x1 の注文が入りました	high	unread	2026-05-13 16:08:16.071661+09	2026-05-13 16:08:16.071661+09
21	sales_order	1	テーブル1	hiro	おつまみ盛り合わせセット x1 の注文が入りました	high	unread	2026-05-13 16:08:46.117666+09	2026-05-13 16:08:46.117666+09
22	sales_order	1	テーブル1	お客様	モヒート x1（お客様）の注文が入りました	high	unread	2026-05-13 22:12:38.752965+09	2026-05-13 22:12:38.752965+09
23	sales_order	1	テーブル1	お客様	マルガリータ x1（お客様）の注文が入りました	high	unread	2026-05-13 22:12:44.966589+09	2026-05-13 22:12:44.966589+09
24	sales_order	1	テーブル1	お客様	イエガーボム x1（お客様）の注文が入りました	high	unread	2026-05-13 22:12:48.398466+09	2026-05-13 22:12:48.398466+09
25	sales_order	1	テーブル1	お客様	おつまみ盛り合わせセット x1（お客様）の注文が入りました	high	unread	2026-05-13 22:12:54.918036+09	2026-05-13 22:12:54.918036+09
26	sales_order	1	テーブル1	お客様	おつまみ盛り合わせセット x1（お客様）の注文が入りました	high	unread	2026-05-13 22:13:03.765043+09	2026-05-13 22:13:03.765043+09
27	sales_order	1	テーブル1	お客様	オレンジジュース x1（お客様）の注文が入りました	high	unread	2026-05-13 22:13:06.656499+09	2026-05-13 22:13:06.656499+09
28	sales_order	1	テーブル1	お客様	アイスティー x1（お客様）の注文が入りました	high	unread	2026-05-13 22:13:13.993896+09	2026-05-13 22:13:13.993896+09
29	sales_order	1	テーブル1	お客様	ショット5杯セット x1（お客様）の注文が入りました	high	unread	2026-05-13 22:13:26.625043+09	2026-05-13 22:13:26.625043+09
30	sales_order	1	テーブル1	お客様	おつまみ盛り合わせセット x1（お客様）の注文が入りました	high	unread	2026-05-13 22:15:06.365735+09	2026-05-13 22:15:06.365735+09
31	sales_order	1	テーブル1	お客様	カクテル飲み比べセット x1（お客様）の注文が入りました	high	unread	2026-05-13 22:15:13.331652+09	2026-05-13 22:15:13.331652+09
32	sales_order	1	テーブル1	お客様	ロングアイランドアイスティー x1（お客様）の注文が入りました	high	unread	2026-05-13 22:15:29.115223+09	2026-05-13 22:15:29.115223+09
33	sales_order	1	テーブル1	hiro	ペアドリンクセット x2 の注文が入りました	high	unread	2026-05-13 22:15:53.652328+09	2026-05-13 22:15:53.652328+09
34	sales_order	1	テーブル1	hiro	おつまみ盛り合わせセット x1 の注文が入りました	high	unread	2026-05-13 22:16:23.459978+09	2026-05-13 22:16:23.459978+09
35	sales_order	1	テーブル1	お客様	マルガリータ x1（管理者注文）	high	unread	2026-05-13 22:16:41.810087+09	2026-05-13 22:16:41.810087+09
36	sales_order	1	テーブル1	hiro	ジントニック x1 の注文が入りました	high	unread	2026-05-13 22:16:48.475904+09	2026-05-13 22:16:48.475904+09
37	sales_order	1	テーブル1	hiro	ジントニック x1 の注文が入りました	high	unread	2026-05-13 22:16:48.730684+09	2026-05-13 22:16:48.730684+09
38	sales_order	1	テーブル1	hiro	ウォッカショット x4 の注文が入りました	high	unread	2026-05-13 22:17:04.101816+09	2026-05-13 22:17:04.101816+09
39	sales_order	1	テーブル1	hiro	ジントニック x1（hiro）の注文が入りました	high	unread	2026-05-13 22:39:54.535352+09	2026-05-13 22:39:54.535352+09
40	sales_order	1	テーブル1	お客様	マルガリータ x1（お客様）の注文が入りました	high	unread	2026-05-13 22:40:10.319343+09	2026-05-13 22:40:10.319343+09
41	sales_order	1	テーブル1	hiro	カクテル飲み比べセット x1（hiro）の注文が入りました	high	unread	2026-05-13 22:42:02.775884+09	2026-05-13 22:42:02.775884+09
42	sales_order	1	テーブル1	hiro	マルガリータ x2 の注文が入りました	high	unread	2026-05-13 22:44:24.437326+09	2026-05-13 22:44:24.437326+09
43	sales_order	1	テーブル1	hiro	ペアドリンクセット x2 の注文が入りました	high	unread	2026-05-13 23:15:02.382655+09	2026-05-13 23:15:02.382655+09
44	sales_order	1	テーブル1	hiro	ペアドリンクセット x1 の注文が入りました	high	unread	2026-05-13 23:15:29.152181+09	2026-05-13 23:15:29.152181+09
45	sales_order	1	テーブル1	hiro	ペアドリンクセット x1 の注文が入りました	high	unread	2026-05-13 23:15:34.626473+09	2026-05-13 23:15:34.626473+09
46	sales_order	1	テーブル1	未選択	3 x1 の注文が入りました	high	unread	2026-05-13 23:50:50.005563+09	2026-05-13 23:50:50.005563+09
47	sales_order	1	テーブル1	未選択	3 x1 の注文が入りました	high	unread	2026-05-14 00:34:20.257762+09	2026-05-14 00:34:20.257762+09
48	sales_order	1	テーブル1	未選択	ドリンク2杯＋フードセット x1 の注文が入りました	high	unread	2026-05-14 00:34:50.610771+09	2026-05-14 00:34:50.610771+09
49	sales_order	1	テーブル1	hiro	オレンジジュース x1 の注文が入りました	high	unread	2026-05-14 00:35:17.212194+09	2026-05-14 00:35:17.212194+09
50	sales_order	2	テーブル2	hiro	ウォッカショット x2 の注文が入りました	high	unread	2026-05-14 15:40:15.4418+09	2026-05-14 15:40:15.4418+09
\.


--
-- Data for Name: product; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.product (id, category_id, name, sku, sale_price, amount, image, other, created_at, updated_at) FROM stdin;
10	1	ビールバック	SHT-005	250.00	50	\N		2026-02-26 13:51:19.624293+09	2026-02-26 13:51:19.624293+09
16	3	コーラ	DRK-001	90.00	50	\N		2026-02-26 13:53:07.365185+09	2026-02-26 13:53:07.365185+09
17	3	ジンジャーエール	DRK-002	95.00	50	\N		2026-02-26 13:53:20.565737+09	2026-02-26 13:53:20.565737+09
21	4	ポテトフライ	FOD-001	210.00	0	\N		2026-02-26 13:54:09.830038+09	2026-02-26 13:54:09.830038+09
23	4	チーズ盛り合わせ	FOD-003	420.00	50	\N		2026-02-26 13:54:44.989216+09	2026-02-26 13:54:44.989216+09
24	4	ナチョス	FOD-004	300.00	50	\N		2026-02-26 13:54:57.039656+09	2026-02-26 13:54:57.039656+09
25	4	ミニバーガー	FOD-005	380.00	50	\N		2026-02-26 13:55:13.781119+09	2026-02-26 13:55:13.781119+09
12	5	カクテル飲み比べセット	SET-002	680.00	46	\N		2026-02-26 13:52:00.846493+09	2026-05-13 22:42:02.758779+09
2	2	マルガリータ	CKT-002	340.00	42	\N		2026-02-26 13:47:08.588921+09	2026-05-13 22:44:24.391101+09
19	3	クランベリージュース	DRK-004	140.00	48	\N		2026-02-26 13:53:46.200346+09	2026-02-28 01:09:10.411373+09
6	1	テキーラショット	SHT-001	180.00	46	\N		2026-02-26 13:49:40.116861+09	2026-03-05 08:58:44.426783+09
3	2	カシスオレンジ	CKT-003	280.00	50	data:image/webp;base64,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		2026-02-26 13:48:40.152731+09	2026-03-05 19:49:26.245091+09
22	4	チキンナゲット	FOD-002	260.00	49	\N		2026-02-26 13:54:28.00477+09	2026-05-05 16:47:24.461413+09
9	1	ジャックダニエルショット	SHT-004	210.00	48	\N		2026-02-26 13:51:06.418614+09	2026-05-13 16:06:56.36297+09
1	2	モヒート	CKT-001	320.00	48	\N		2026-02-26 13:46:09.147128+09	2026-05-13 22:12:38.732365+09
20	3	アイスティー	DRK-005	100.00	48	\N		2026-02-26 13:53:57.455125+09	2026-05-13 22:13:13.96028+09
13	5	ショット5杯セット	SET-003	750.00	49	\N		2026-02-26 13:52:16.136278+09	2026-05-13 22:13:26.613304+09
5	2	ロングアイランドアイスティー	CKT-005	380.00	49	\N		2026-02-26 13:49:24.574661+09	2026-05-13 22:15:28.990302+09
14	5	おつまみ盛り合わせセット	SET-004	560.00	40	\N		2026-02-26 13:52:30.460197+09	2026-05-13 22:16:23.443161+09
4	2	ジントニック	CKT-004	260.00	44	\N		2026-02-26 13:49:09.312762+09	2026-05-13 22:39:54.495642+09
15	5	ペアドリンクセット	SET-005	620.00	48	\N		2026-02-26 13:52:45.596787+09	2026-05-14 00:01:10.728249+09
26	3	3	23	23.00	22	data:image/webp;base64,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		2026-03-05 22:48:47.944758+09	2026-05-14 00:34:19.936007+09
11	5	ドリンク2杯＋フードセット	SET-001	520.00	48	\N		2026-02-26 13:51:44.939872+09	2026-05-14 00:35:00.591989+09
18	3	オレンジジュース	DRK-003	110.00	47	\N		2026-02-26 13:53:34.656045+09	2026-05-14 02:04:50.882076+09
8	1	イエガーボム	SHT-003	220.00	45	\N		2026-02-26 13:50:16.94892+09	2026-05-14 15:40:08.073644+09
7	1	ウォッカショット	SHT-002	160.00	39	\N		2026-02-26 13:49:56.957061+09	2026-05-14 15:40:15.349932+09
\.


--
-- Data for Name: project_variable; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.project_variable (id, name, value, other, created_at, updated_at) FROM stdin;
1	store_name	1234	店舗名	2026-02-25 17:15:51.693193+09	2026-02-25 18:14:05.028012+09
3	store_tel	1234	店舗電話番号	2026-02-25 17:15:51.693193+09	2026-02-25 18:14:05.02814+09
2	store_address	1234	店舗住所	2026-02-25 17:15:51.693193+09	2026-02-25 18:14:05.034021+09
134	receipt_greeting	ありがとうございます。\nまたのご来店をお待ちしております。	領収書挨拶文（改行可）	2026-02-26 14:28:54.394741+09	2026-02-26 14:28:54.394741+09
147	store_id		店舗ID（領収書最下部）	2026-02-26 14:28:54.394741+09	2026-02-26 14:28:54.394741+09
1950	printer_ip	192.168.1.8	メインレシートプリンターIP	2026-03-08 20:40:04.400087+09	2026-03-11 11:45:54.352353+09
152	receipt_payment_id_last	20260508003	領収書決済ID 最終発行	2026-02-26 14:28:55.500323+09	2026-05-08 16:35:39.697045+09
3534	session_time_adjust_step_min	5	開始/終了時刻の調整単位（分）	2026-05-05 18:33:17.378823+09	2026-05-13 08:13:14.776703+09
7833	order_approval_required	false	テーブル注文を管理者が手動承認するか（false=自動承認）	2026-05-13 09:05:45.535725+09	2026-05-13 15:25:00.917455+09
9254	system_time	06:00	システム日付変更時刻 (HH:MM, JST)	2026-05-14 16:38:32.937453+09	2026-05-14 16:38:32.937453+09
\.


--
-- Data for Name: salary; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.salary (id, user_id, year, month, basic_hours, base_pay, main_nomination_count, main_nomination_fee, inside_nomination_count, inside_nomination_fee, sales_back_yen, together_nomination_cost, together_nomination_count, together_nomination_fee, overtime_wage_yen, deduction_yen, total_pay_yen, paid_price, realtotal_price, created_at, updated_at, pickup_yen, hairmake_yen, rental_yen, other_deduct_yen, penalty_yen, bonus_yen, point_yen, additional_point_yen) FROM stdin;
404	3	2026	3	0.00	0.00	0	0.00	0	0.00	680.00	0.00	0	0.00	0.00	30.00	11.00	10.00	0.00	2026-03-01 14:11:18.17257+09	2026-03-08 21:42:30.769974+09	0.00	20.00	0.00	0.00	0.00	11.00	0.00	0.00
402	4	2026	3	0.00	0.00	0	0.00	0	0.00	0.00	0.00	0	0.00	0.00	0.00	0.00	0.00	0.00	2026-03-01 14:11:18.177696+09	2026-03-08 21:42:30.849447+09	0.00	0.00	0.00	0.00	0.00	0.00	0.00	0.00
778	6	2026	5	0.36	0.00	0	0.00	0	0.00	0.00	0.00	0	0.00	0.00	0.00	0.00	0.00	0.00	2026-05-05 12:05:31.25163+09	2026-05-12 12:50:51.939629+09	0.00	0.00	0.00	0.00	0.00	0.00	0.00	0.00
401	6	2026	3	0.00	0.00	0	0.00	0	0.00	0.00	0.00	0	0.00	0.00	0.00	0.00	0.00	0.00	2026-03-01 14:11:18.181898+09	2026-03-08 21:42:30.850882+09	0.00	0.00	0.00	0.00	0.00	0.00	0.00	0.00
400	7	2026	3	0.00	0.00	0	0.00	0	0.00	0.00	0.00	0	0.00	0.00	0.00	0.00	0.00	0.00	2026-03-01 14:11:18.186394+09	2026-03-08 21:42:30.856468+09	0.00	0.00	0.00	0.00	0.00	0.00	0.00	0.00
405	5	2026	3	0.00	0.00	0	0.00	0	0.00	0.00	0.00	0	0.00	0.00	0.00	0.00	0.00	0.00	2026-03-01 14:11:18.192683+09	2026-03-08 21:42:30.868909+09	0.00	0.00	0.00	0.00	0.00	0.00	0.00	0.00
783	5	2026	5	11.17	18700.00	0	0.00	0	0.00	0.00	0.00	0	0.00	0.00	0.00	18700.00	0.00	18700.00	2026-05-05 12:05:31.320653+09	2026-05-12 12:50:52.03547+09	0.00	0.00	0.00	0.00	0.00	0.00	0.00	0.00
804	13	2026	5	0.00	0.00	0	0.00	0	0.00	0.00	0.00	0	0.00	0.00	0.00	0.00	0.00	0.00	2026-05-05 22:53:31.24924+09	2026-05-12 12:50:52.040629+09	0.00	0.00	0.00	0.00	0.00	0.00	0.00	0.00
806	16	2026	5	0.00	0.00	0	0.00	0	0.00	0.00	0.00	0	0.00	0.00	0.00	0.00	0.00	0.00	2026-05-05 22:53:31.307069+09	2026-05-12 12:50:52.050117+09	0.00	0.00	0.00	0.00	0.00	0.00	0.00	0.00
772	7	2026	5	0.15	0.00	0	0.00	0	0.00	0.00	0.00	0	0.00	0.00	0.00	0.00	0.00	0.00	2026-05-05 10:38:23.282721+09	2026-05-12 13:14:46.312651+09	0.00	0.00	0.00	0.00	0.00	0.00	0.00	0.00
805	19	2026	5	0.03	0.00	0	0.00	0	0.00	0.00	0.00	0	0.00	0.00	0.00	0.00	0.00	0.00	2026-05-05 22:53:31.254182+09	2026-05-12 13:15:06.242191+09	0.00	0.00	0.00	0.00	0.00	0.00	0.00	0.00
800	17	2026	5	0.03	0.00	0	0.00	0	0.00	0.00	0.00	0	0.00	0.00	0.00	0.00	0.00	0.00	2026-05-05 22:53:31.223812+09	2026-05-12 13:15:09.722461+09	0.00	0.00	0.00	0.00	0.00	0.00	0.00	0.00
2	4	2026	2	0.00	0.00	0	0.00	0	0.00	0.00	0.00	0	0.00	0.00	334.00	0.00	334.00	0.00	2026-02-26 16:41:14.964865+09	2026-03-01 16:44:23.082813+09	0.00	0.00	0.00	0.00	0.00	0.00	0.00	0.00
4	3	2026	2	0.00	0.00	1	900.00	0	0.00	404.00	0.00	0	0.00	0.00	463.00	2204.00	45.00	0.00	2026-02-26 16:41:14.961221+09	2026-03-01 16:44:23.083358+09	44.00	341.00	0.00	0.00	33.00	0.00	0.00	0.00
6	5	2026	2	0.00	0.00	0	0.00	0	0.00	0.00	0.00	0	0.00	0.00	0.00	0.00	0.00	0.00	2026-02-26 16:41:14.977854+09	2026-03-01 16:44:23.11779+09	0.00	0.00	0.00	0.00	0.00	0.00	0.00	0.00
1	6	2026	2	0.00	0.00	0	0.00	0	0.00	0.00	0.00	0	0.00	0.00	0.00	0.00	0.00	0.00	2026-02-26 12:57:47.630616+09	2026-05-05 12:41:43.095393+09	0.00	0.00	0.00	0.00	0.00	0.00	0.00	0.00
5	7	2026	2	0.00	0.00	0	0.00	0	0.00	0.00	0.00	0	0.00	0.00	0.00	0.00	0.00	0.00	2026-02-26 16:41:14.972633+09	2026-05-05 12:41:46.480622+09	0.00	0.00	0.00	0.00	0.00	0.00	0.00	0.00
773	4	2026	5	121.28	229900.00	0	0.00	1	600.00	4564.80	0.00	0	0.00	0.00	0.00	229900.00	0.00	229900.00	2026-05-05 10:38:25.960453+09	2026-05-14 15:40:15.349932+09	0.00	0.00	0.00	0.00	0.00	0.00	0.00	0.00
799	14	2026	5	0.00	0.00	0	0.00	0	0.00	0.00	0.00	0	0.00	0.00	0.00	0.00	0.00	0.00	2026-05-05 22:53:31.170694+09	2026-05-12 12:50:51.808503+09	0.00	0.00	0.00	0.00	0.00	0.00	0.00	0.00
797	18	2026	5	0.00	0.00	0	0.00	0	0.00	0.00	0.00	0	0.00	0.00	0.00	0.00	0.00	0.00	2026-05-05 22:53:31.174838+09	2026-05-12 12:50:51.8274+09	0.00	0.00	0.00	0.00	0.00	0.00	0.00	0.00
798	15	2026	5	0.02	0.00	0	0.00	0	0.00	0.00	0.00	0	0.00	0.00	0.00	0.00	0.00	0.00	2026-05-05 22:53:31.17925+09	2026-05-12 13:14:50.217185+09	0.00	0.00	0.00	0.00	0.00	0.00	0.00	0.00
771	3	2026	5	266.72	453050.00	0	0.00	0	0.00	0.00	0.00	0	0.00	0.00	0.00	226100.00	0.00	226100.00	2026-05-04 17:25:02.189156+09	2026-05-12 13:19:03.356392+09	0.00	0.00	0.00	0.00	0.00	0.00	0.00	0.00
\.


--
-- Data for Name: salary_attenday; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.salary_attenday (id, category_id, attenday_number, value, other, created_at, updated_at) FROM stdin;
13	1	6	300.00	\N	2026-02-28 00:46:43.683269+09	2026-05-13 12:31:47.786133+09
11	1	4	300.00	\N	2026-02-28 00:46:43.664526+09	2026-05-13 12:31:47.786653+09
12	1	5	300.00	\N	2026-02-28 00:46:43.675029+09	2026-05-13 12:31:47.790153+09
10	1	3	300.00	\N	2026-02-28 00:46:43.664456+09	2026-05-13 12:31:47.786398+09
14	1	7	300.00	\N	2026-02-28 00:46:43.695418+09	2026-05-13 12:31:50.77575+09
3	2	3	300.00	\N	2026-02-28 00:46:23.053954+09	2026-05-13 12:31:50.784916+09
7	2	4	300.00	\N	2026-02-28 00:46:23.076553+09	2026-05-13 12:31:50.793501+09
5	2	5	300.00	\N	2026-02-28 00:46:23.070974+09	2026-05-13 12:31:50.793894+09
6	2	6	300.00	\N	2026-02-28 00:46:23.076423+09	2026-05-13 12:31:50.832417+09
2	2	7	300.00	\N	2026-02-28 00:46:23.027767+09	2026-05-13 12:31:50.832568+09
8	1	1	360.00	\N	2026-02-28 00:46:43.642183+09	2026-05-13 12:36:53.33221+09
9	1	2	270.00	\N	2026-02-28 00:46:43.66437+09	2026-05-13 12:36:53.336064+09
4	2	2	270.00	\N	2026-02-28 00:46:23.061017+09	2026-05-13 12:36:53.336172+09
1	2	1	360.00	\N	2026-02-28 00:46:23.009026+09	2026-05-13 12:36:53.335968+09
\.


--
-- Data for Name: salary_category; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.salary_category (id, cast_id, category_id, value, other, created_at, updated_at) FROM stdin;
1	3	3	0.30	\N	2026-02-28 00:46:53.873269+09	2026-02-28 00:47:05.256373+09
2	4	3	0.30	\N	2026-02-28 00:46:53.877422+09	2026-02-28 00:47:09.581267+09
3	5	3	0.30	\N	2026-02-28 00:46:53.878355+09	2026-02-28 00:47:12.926293+09
4	6	3	0.40	\N	2026-02-28 00:46:53.87946+09	2026-02-28 00:47:19.367264+09
5	7	3	0.25	\N	2026-02-28 00:46:53.880608+09	2026-02-28 00:47:31.837323+09
6	2	4	-1.00	\N	2026-02-28 00:47:38.568454+09	2026-02-28 00:47:38.568454+09
7	3	4	-1.00	\N	2026-02-28 00:47:38.568454+09	2026-02-28 00:47:38.568454+09
8	4	4	-1.00	\N	2026-02-28 00:47:38.568454+09	2026-02-28 00:47:38.568454+09
9	5	4	-1.00	\N	2026-02-28 00:47:38.568454+09	2026-02-28 00:47:38.568454+09
10	6	4	-1.00	\N	2026-02-28 00:47:38.568454+09	2026-02-28 00:47:38.568454+09
11	7	4	-1.00	\N	2026-02-28 00:47:38.568454+09	2026-02-28 00:47:38.568454+09
12	8	4	-1.00	\N	2026-02-28 00:47:38.568454+09	2026-02-28 00:47:38.568454+09
13	9	4	-1.00	\N	2026-02-28 00:47:38.568454+09	2026-02-28 00:47:38.568454+09
14	10	4	-1.00	\N	2026-02-28 00:47:38.568454+09	2026-02-28 00:47:38.568454+09
15	11	4	-1.00	\N	2026-02-28 00:47:38.568454+09	2026-02-28 00:47:38.568454+09
16	12	4	-1.00	\N	2026-02-28 00:47:38.568454+09	2026-02-28 00:47:38.568454+09
17	3	5	0.32	\N	2026-05-13 12:32:28.102404+09	2026-05-13 12:32:35.710473+09
19	5	5	0.32	\N	2026-05-13 12:32:28.208241+09	2026-05-13 12:32:35.712413+09
20	6	5	0.32	\N	2026-05-13 12:32:28.210076+09	2026-05-13 12:32:35.713248+09
21	7	5	0.32	\N	2026-05-13 12:32:28.211743+09	2026-05-13 12:32:35.714066+09
22	13	5	0.32	\N	2026-05-13 12:32:28.213362+09	2026-05-13 12:32:35.714936+09
23	14	5	0.32	\N	2026-05-13 12:32:28.214989+09	2026-05-13 12:32:35.715715+09
24	15	5	0.32	\N	2026-05-13 12:32:28.216444+09	2026-05-13 12:32:35.716463+09
25	16	5	0.32	\N	2026-05-13 12:32:28.217969+09	2026-05-13 12:32:35.717212+09
26	17	5	0.32	\N	2026-05-13 12:32:28.219537+09	2026-05-13 12:32:35.717922+09
27	18	5	0.32	\N	2026-05-13 12:32:28.221183+09	2026-05-13 12:32:35.718788+09
28	19	5	0.32	\N	2026-05-13 12:32:28.222544+09	2026-05-13 12:32:35.719618+09
18	4	5	0.32	\N	2026-05-13 12:32:28.206483+09	2026-05-13 12:32:44.349313+09
29	3	1	360.00	\N	2026-05-18 00:00:00.127349+09	2026-05-18 00:00:00.127349+09
30	3	2	360.00	\N	2026-05-18 00:00:00.131984+09	2026-05-18 00:00:00.131984+09
31	7	1	360.00	\N	2026-05-18 00:00:00.132871+09	2026-05-18 00:00:00.132871+09
32	7	2	360.00	\N	2026-05-18 00:00:00.133754+09	2026-05-18 00:00:00.133754+09
33	15	1	360.00	\N	2026-05-18 00:00:00.134611+09	2026-05-18 00:00:00.134611+09
34	15	2	360.00	\N	2026-05-18 00:00:00.135477+09	2026-05-18 00:00:00.135477+09
35	17	1	360.00	\N	2026-05-18 00:00:00.136434+09	2026-05-18 00:00:00.136434+09
36	17	2	360.00	\N	2026-05-18 00:00:00.137265+09	2026-05-18 00:00:00.137265+09
37	19	1	360.00	\N	2026-05-18 00:00:00.138153+09	2026-05-18 00:00:00.138153+09
38	19	2	360.00	\N	2026-05-18 00:00:00.13895+09	2026-05-18 00:00:00.13895+09
\.


--
-- Data for Name: salary_daily; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.salary_daily (id, date, user_id, basic_hours, paid_price, pickup_yen, hairmake_yen, rental_yen, other_deduct_yen, penalty_yen, deduction_yen, hourly_price, base_pay, main_nomination_count, main_nomination_fee, main_nomination_extension_count, main_nomination_extension_fee, inside_nomination_count, inside_nomination_fee, inside_nomination_extension_count, inside_nomination_extension_fee, together_nomination_count, together_nomination_fee, category_totals, bonus_yen, point_yen, additional_point_yen, back_total, total_pay_yen, realtotal_price, created_at, updated_at) FROM stdin;
1	2026-02-28	3	0.00	45.00	44.00	341.00	0.00	0.00	33.00	463.00	0.00	0.00	1	900.00	1	900.00	0	0.00	0	0.00	0	0.00	{"1": 320, "3": 84}	0.00	0.00	0.00	2204.00	2204.00	1741.00	2026-02-28 18:56:47.345085+09	2026-02-28 18:57:33.609697+09
14	2026-02-28	4	0.00	334.00	0.00	0.00	0.00	0.00	0.00	334.00	0.00	0.00	0	0.00	0	0.00	0	0.00	0	0.00	0	0.00	{}	0.00	0.00	0.00	0.00	0.00	-334.00	2026-02-28 18:58:28.835139+09	2026-02-28 18:58:39.833631+09
21	2026-03-01	3	0.00	10.00	0.00	20.00	0.00	0.00	0.00	30.00	0.00	0.00	0	0.00	0	0.00	0	0.00	0	0.00	0	0.00	{}	11.00	0.00	0.00	0.00	11.00	-19.00	2026-03-01 14:28:56.045218+09	2026-03-01 16:18:42.623938+09
\.


--
-- Data for Name: salary_full; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.salary_full (id, category_id, other, created_at, updated_at) FROM stdin;
1	4	\N	2026-02-28 00:47:38.568454+09	2026-02-28 00:47:38.568454+09
\.


--
-- Data for Name: salesorder; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.salesorder (id, cast_id, product_id, amount, table_id, session_id, unit_price, total_price, castsalary_price, for_cast, status, accepted_at, accepted_by, created_at, updated_at) FROM stdin;
3	3	19	2	1	6	140.00	280.00	84.00	1	accepted	2026-02-28 01:38:04.402019+09	8	2026-02-28 01:09:10.411373+09	2026-02-28 01:38:04.402019+09
2	3	7	2	1	6	160.00	320.00	320.00	1	accepted	2026-02-28 01:38:06.343203+09	8	2026-02-28 01:08:59.400612+09	2026-02-28 01:38:06.343203+09
1	\N	4	2	1	6	260.00	520.00	0.00	0	accepted	2026-02-28 01:38:07.927172+09	8	2026-02-28 01:08:51.291942+09	2026-02-28 01:38:07.927172+09
4	\N	1	1	2	13	320.00	320.00	0.00	0	accepted	2026-03-05 00:31:42.287615+09	8	2026-03-04 22:08:47.747585+09	2026-03-05 00:31:42.287615+09
5	\N	7	1	2	13	160.00	160.00	0.00	0	accepted	2026-03-05 00:31:42.358733+09	8	2026-03-04 22:09:09.922138+09	2026-03-05 00:31:42.358733+09
6	\N	8	2	4	14	220.00	440.00	0.00	1	accepted	2026-03-05 08:59:13.912431+09	8	2026-03-05 01:45:59.478087+09	2026-03-05 08:59:13.912431+09
7	3	2	2	1	15	340.00	680.00	680.00	1	accepted	2026-03-05 08:59:15.714813+09	8	2026-03-05 08:58:38.872478+09	2026-03-05 08:59:15.714813+09
8	\N	6	4	1	15	180.00	720.00	0.00	0	accepted	2026-03-05 08:59:17.224512+09	8	2026-03-05 08:58:44.426783+09	2026-03-05 08:59:17.224512+09
9	\N	20	1	1	15	100.00	100.00	0.00	0	accepted	2026-03-05 08:59:18.494593+09	8	2026-03-05 08:58:47.858017+09	2026-03-05 08:59:18.494593+09
10	\N	4	1	2	18	260.00	260.00	0.00	1	accepted	2026-05-01 18:13:53.202647+09	8	2026-05-01 18:13:05.912086+09	2026-05-01 18:13:53.202647+09
31	\N	12	1	1	56	680.00	680.00	0.00	0	accepted	2026-05-13 22:15:13.319123+09	\N	2026-05-13 22:15:13.319123+09	2026-05-13 22:15:13.319123+09
12	\N	22	1	1	28	260.00	260.00	0.00	0	pending	\N	\N	2026-05-05 16:47:24.461413+09	2026-05-05 16:47:24.461413+09
13	\N	7	2	1	52	160.00	320.00	0.00	0	accepted	2026-05-13 09:05:34.056357+09	2	2026-05-13 09:05:12.016001+09	2026-05-13 09:05:34.056357+09
14	\N	9	1	1	52	210.00	210.00	0.00	0	accepted	2026-05-13 09:06:10.893069+09	\N	2026-05-13 09:06:10.893069+09	2026-05-13 09:06:10.893069+09
15	\N	12	2	1	52	680.00	1360.00	0.00	0	accepted	2026-05-13 09:06:29.451279+09	\N	2026-05-13 09:06:29.451279+09	2026-05-13 09:06:29.451279+09
16	\N	2	1	2	53	340.00	340.00	0.00	0	accepted	2026-05-13 15:25:26.909353+09	\N	2026-05-13 15:25:26.909353+09	2026-05-13 15:26:02.822051+09
18	4	9	1	1	54	210.00	210.00	210.00	1	accepted	2026-05-13 16:06:56.36297+09	\N	2026-05-13 16:06:56.36297+09	2026-05-13 16:06:56.36297+09
19	4	14	4	1	54	560.00	2240.00	716.80	1	accepted	2026-05-13 16:07:18.076439+09	\N	2026-05-13 16:07:18.076439+09	2026-05-13 16:07:18.076439+09
20	4	14	1	1	54	560.00	560.00	179.20	1	accepted	2026-05-13 16:08:16.057375+09	\N	2026-05-13 16:08:16.057375+09	2026-05-13 16:08:16.057375+09
21	4	14	1	1	54	560.00	560.00	179.20	1	accepted	2026-05-13 16:08:46.101826+09	\N	2026-05-13 16:08:46.101826+09	2026-05-13 16:08:46.101826+09
22	\N	1	1	1	55	320.00	320.00	0.00	0	accepted	2026-05-13 22:12:38.732365+09	\N	2026-05-13 22:12:38.732365+09	2026-05-13 22:12:38.732365+09
23	\N	2	1	1	55	340.00	340.00	0.00	0	accepted	2026-05-13 22:12:44.935443+09	\N	2026-05-13 22:12:44.935443+09	2026-05-13 22:12:44.935443+09
24	\N	8	1	1	55	220.00	220.00	0.00	0	accepted	2026-05-13 22:12:48.216808+09	\N	2026-05-13 22:12:48.216808+09	2026-05-13 22:12:48.216808+09
25	\N	14	1	1	55	560.00	560.00	0.00	0	accepted	2026-05-13 22:12:54.864323+09	\N	2026-05-13 22:12:54.864323+09	2026-05-13 22:12:54.864323+09
26	\N	14	1	1	55	560.00	560.00	0.00	0	accepted	2026-05-13 22:13:03.735492+09	\N	2026-05-13 22:13:03.735492+09	2026-05-13 22:13:03.735492+09
27	\N	18	1	1	55	110.00	110.00	0.00	0	accepted	2026-05-13 22:13:06.438223+09	\N	2026-05-13 22:13:06.438223+09	2026-05-13 22:13:06.438223+09
28	\N	20	1	1	55	100.00	100.00	0.00	0	accepted	2026-05-13 22:13:13.96028+09	\N	2026-05-13 22:13:13.96028+09	2026-05-13 22:13:13.96028+09
29	\N	13	1	1	55	750.00	750.00	0.00	0	accepted	2026-05-13 22:13:26.613304+09	\N	2026-05-13 22:13:26.613304+09	2026-05-13 22:13:26.613304+09
30	\N	14	1	1	56	560.00	560.00	0.00	0	accepted	2026-05-13 22:15:06.353457+09	\N	2026-05-13 22:15:06.353457+09	2026-05-13 22:15:06.353457+09
32	\N	5	1	1	56	380.00	380.00	0.00	0	accepted	2026-05-13 22:15:28.990302+09	\N	2026-05-13 22:15:28.990302+09	2026-05-13 22:15:28.990302+09
33	4	15	2	1	56	620.00	1240.00	396.80	1	accepted	2026-05-13 22:15:53.308016+09	\N	2026-05-13 22:15:53.308016+09	2026-05-13 22:15:53.308016+09
34	4	14	1	1	56	560.00	560.00	179.20	1	accepted	2026-05-13 22:16:23.443161+09	\N	2026-05-13 22:16:23.443161+09	2026-05-13 22:16:23.443161+09
35	\N	2	1	1	56	340.00	340.00	0.00	0	accepted	2026-05-13 22:16:41.633652+09	\N	2026-05-13 22:16:41.633652+09	2026-05-13 22:16:41.633652+09
36	4	4	1	1	56	260.00	260.00	260.00	1	accepted	2026-05-13 22:16:48.067198+09	\N	2026-05-13 22:16:48.067198+09	2026-05-13 22:16:48.067198+09
37	4	4	1	1	56	260.00	260.00	260.00	1	accepted	2026-05-13 22:16:48.130703+09	\N	2026-05-13 22:16:48.130703+09	2026-05-13 22:16:48.130703+09
38	4	7	4	1	56	160.00	640.00	640.00	1	accepted	2026-05-13 22:17:03.973135+09	\N	2026-05-13 22:17:03.973135+09	2026-05-13 22:17:03.973135+09
39	4	4	1	1	56	260.00	260.00	260.00	1	accepted	2026-05-13 22:39:54.495642+09	\N	2026-05-13 22:39:54.495642+09	2026-05-13 22:39:54.495642+09
40	\N	2	1	1	56	340.00	340.00	0.00	0	accepted	2026-05-13 22:40:10.305705+09	\N	2026-05-13 22:40:10.305705+09	2026-05-13 22:40:10.305705+09
41	4	12	1	1	56	680.00	680.00	217.60	1	accepted	2026-05-13 22:42:02.758779+09	\N	2026-05-13 22:42:02.758779+09	2026-05-13 22:42:02.758779+09
42	4	2	2	1	57	340.00	680.00	680.00	1	accepted	2026-05-13 22:44:24.391101+09	\N	2026-05-13 22:44:24.391101+09	2026-05-13 22:44:24.391101+09
47	\N	26	1	1	58	23.00	23.00	0.00	0	accepted	2026-05-14 00:34:19.936007+09	\N	2026-05-14 00:34:19.936007+09	2026-05-14 00:34:19.936007+09
48	\N	11	2	1	58	520.00	1040.00	0.00	0	accepted	2026-05-14 00:34:50.595122+09	\N	2026-05-14 00:34:50.595122+09	2026-05-14 00:35:00.591989+09
49	4	18	2	1	58	110.00	220.00	66.00	1	accepted	2026-05-14 00:35:17.17688+09	\N	2026-05-14 00:35:17.17688+09	2026-05-14 02:04:50.882076+09
17	\N	8	2	2	53	220.00	440.00	0.00	0	accepted	2026-05-13 15:25:30.231993+09	\N	2026-05-13 15:25:30.231993+09	2026-05-14 15:40:08.073644+09
50	4	7	2	2	53	160.00	320.00	320.00	1	accepted	2026-05-14 15:40:15.349932+09	\N	2026-05-14 15:40:15.349932+09	2026-05-14 15:40:15.349932+09
\.


--
-- Data for Name: serviceorder; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.serviceorder (id, cast_id, service_id, amount, table_id, session_id, status, accepted_at, accepted_by, created_at, updated_at) FROM stdin;
\.


--
-- Data for Name: services; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.services (id, name, other, created_at, updated_at) FROM stdin;
\.


--
-- Data for Name: session_item_overrides; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.session_item_overrides (id, session_id, item_key, unit_price, quantity, total, created_at, updated_at) FROM stdin;
\.


--
-- Data for Name: session_payments; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.session_payments (id, session_id, pay_type, amount, other, created_at, updated_at) FROM stdin;
\.


--
-- Data for Name: sessions; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.sessions (id, table_id, cost, end_at, client, set_count, set_extensions, status, is_paused, paused_at, paused_elapsed, pay_type, created_at, updated_at) FROM stdin;
12	2	0.00	2026-03-03 09:06:50.278+09	2	3	[]	0	f	\N	22	\N	2026-03-03 09:05:32.974964+09	2026-03-03 09:06:50.327141+09
2	6	0.00	2026-02-26 11:49:43.624+09	2	1	[]	0	f	\N	37	\N	2026-02-26 09:03:55.316299+09	2026-02-26 11:49:43.681161+09
3	7	0.00	2026-02-26 12:54:40.672+09	2	1	[]	0	f	\N	4	\N	2026-02-26 09:05:44.691323+09	2026-02-26 12:54:41.956957+09
4	5	0.00	2026-02-26 12:54:54.089+09	2	1	[]	0	f	\N	9358	\N	2026-02-26 09:19:50.530855+09	2026-02-26 12:54:54.109492+09
13	2	0.00	2026-03-05 00:36:12.349+09	2	1	[]	0	t	2026-03-04 22:08:38.318+09	0	\N	2026-03-04 22:08:38.319153+09	2026-03-05 00:36:13.32695+09
1	2	0.00	2026-02-26 12:56:50.105+09	2	1	[]	0	t	2026-02-26 12:56:46.194+09	13909	\N	2026-02-26 09:03:08.523238+09	2026-02-26 12:56:50.125443+09
29	2	0.00	2026-05-05 17:05:08.311+09	6	1	[]	0	t	2026-05-05 17:12:53.376+09	0	\N	2026-05-05 17:02:53.377+09	2026-05-05 17:05:08.356014+09
6	1	0.00	2026-03-03 02:45:28.84+09	2	2	[]	0	f	\N	48	\N	2026-02-28 01:08:44.145409+09	2026-03-03 02:45:29.84534+09
5	2	0.00	2026-03-03 02:45:35.447+09	2	1	[]	0	f	\N	1999	\N	2026-02-26 12:56:55.008866+09	2026-03-03 02:45:35.466142+09
14	4	0.00	2026-03-05 08:57:41.809+09	2	3	[]	0	f	\N	4193	\N	2026-03-05 00:36:20.300312+09	2026-03-05 08:57:41.855212+09
25	2	0.00	2026-05-05 16:32:41.215+09	5	2	[]	0	t	2026-05-05 16:32:37.471+09	46749	\N	2026-05-05 02:14:39.196+09	2026-05-05 16:32:41.302877+09
7	2	0.00	2026-03-03 03:00:06.8+09	2	3	[]	0	f	\N	26	\N	2026-03-03 02:45:49.622951+09	2026-03-03 03:00:06.839468+09
24	1	0.00	2026-05-05 09:35:03.282+09	5	2	[]	0	t	2026-05-05 02:01:03.972+09	0	\N	2026-05-05 02:01:03.976201+09	2026-05-05 09:35:03.334362+09
30	2	0.00	2026-05-05 17:05:57.502+09	6	1	[]	0	t	2026-05-05 17:25:13.237+09	0	\N	2026-05-05 17:15:13.238+09	2026-05-05 17:05:57.544221+09
15	1	0.00	2026-03-06 00:54:12.484+09	2	4	[]	0	f	\N	679	\N	2026-03-05 08:57:46.378113+09	2026-03-06 00:54:12.558083+09
8	2	0.00	2026-03-03 03:45:39.19+09	2	6	[]	0	f	\N	93	\N	2026-03-03 03:00:13.145298+09	2026-03-03 03:45:39.218612+09
9	3	0.00	2026-03-03 03:48:52.203+09	2	3	[]	0	f	\N	24	\N	2026-03-03 03:45:50.373617+09	2026-03-03 03:48:52.224341+09
31	1	0.00	2026-05-05 18:15:06.43+09	6	1	[]	0	t	2026-05-05 17:31:01.133+09	0	\N	2026-05-05 17:21:01.133+09	2026-05-05 18:15:06.516975+09
10	2	0.00	2026-03-03 03:51:25.43+09	2	2	[]	0	f	\N	138	\N	2026-03-03 03:48:56.412841+09	2026-03-03 03:51:25.470325+09
26	1	0.00	2026-05-05 16:34:33.943+09	5	1	[]	0	t	2026-05-05 16:32:46.31+09	0	\N	2026-05-05 16:32:47.16+09	2026-05-05 16:34:33.990275+09
11	3	0.00	2026-03-03 09:05:27.694+09	2	2	[]	0	f	\N	3	\N	2026-03-03 03:51:30.19338+09	2026-03-03 09:05:27.719119+09
16	1	0.00	2026-05-01 18:04:06.033+09	2	2	[]	0	f	\N	31966	\N	2026-03-05 23:04:26.677+09	2026-05-01 18:04:07.765503+09
18	2	0.00	2026-05-01 18:29:47.777+09	2	1	[]	0	f	\N	4	\N	2026-05-01 18:12:43.169396+09	2026-05-01 18:29:47.892247+09
38	2	0.00	2026-05-06 10:39:39.659+09	8	1	[]	0	t	2026-05-06 10:05:51.87+09	0	\N	2026-05-06 10:05:51.87164+09	2026-05-06 10:39:43.440782+09
20	2	0.00	2026-05-04 10:56:39.803+09	8	1	[]	0	f	\N	8540	\N	2026-05-04 08:33:23.700164+09	2026-05-04 10:56:39.848456+09
22	4	0.00	2026-05-05 02:00:38.588+09	4	1	[]	0	t	2026-05-04 10:59:46.003+09	0	\N	2026-05-04 10:59:46.003881+09	2026-05-05 02:00:47.725781+09
19	1	0.00	2026-05-05 02:00:57.341+09	3	1	[]	0	t	2026-05-04 01:03:57.494+09	0	\N	2026-05-04 01:03:57.496335+09	2026-05-05 02:00:57.39803+09
17	3	0.00	2026-05-05 23:52:18.845+09	3	2	[]	0	f	\N	362457	\N	2026-05-01 17:42:59.828+09	2026-05-05 23:52:19.86383+09
27	1	0.00	2026-05-05 16:42:22.719+09	5	1	[]	0	t	2026-05-05 16:34:38.531+09	0	\N	2026-05-05 16:34:39.995+09	2026-05-05 16:42:22.785194+09
28	1	0.00	2026-05-05 16:47:48.534+09	5	1	[]	0	t	2026-05-05 16:42:28.189+09	0	\N	2026-05-05 16:42:29.31+09	2026-05-05 16:47:48.582767+09
34	6	0.00	2026-05-06 08:51:08.785+09	5	1	[]	0	f	\N	85	\N	2026-05-05 23:52:47.516887+09	2026-05-06 08:51:09.139651+09
32	2	0.00	2026-05-05 18:38:17.95+09	5	1	[]	0	t	2026-05-05 18:20:10.812+09	0	\N	2026-05-05 18:10:11.578+09	2026-05-05 22:45:47.222375+09
45	2	0.00	2026-05-06 16:50:19.93+09	5	4	[]	0	f	\N	36	\N	2026-05-06 16:26:32.380033+09	2026-05-06 16:50:20.924403+09
33	2	0.00	2026-05-05 23:23:00.956+09	6	1	[]	0	t	2026-05-05 23:22:37.796+09	9609	\N	2026-05-05 19:21:28.821+09	2026-05-05 23:23:01.078662+09
36	2	0.00	2026-05-06 09:36:24.087+09	5	1	[]	0	f	\N	32	\N	2026-05-06 09:28:41.865399+09	2026-05-06 09:36:24.142888+09
47	1	0.00	2026-05-07 20:58:15.615+09	5	5	[]	0	f	\N	1815	\N	2026-05-06 17:05:43.732205+09	2026-05-07 20:58:16.646104+09
43	3	0.00	\N	5	1	[]	1	f	\N	49	\N	2026-05-06 16:02:54.301253+09	2026-05-06 16:07:21.31753+09
40	2	0.00	2026-05-06 11:38:24.384+09	6	2	[]	0	f	\N	1102	\N	2026-05-06 10:45:47.681352+09	2026-05-06 11:38:24.464952+09
42	2	0.00	2026-05-06 16:15:14.938+09	4	3	[]	0	f	\N	13513	\N	2026-05-06 12:01:41.561434+09	2026-05-06 16:15:16.174204+09
39	2	0.00	2026-05-06 10:44:42.441+09	6	2	[]	0	f	\N	20	\N	2026-05-06 10:39:48.729538+09	2026-05-06 10:44:42.484557+09
44	2	0.00	2026-05-06 16:26:16.554+09	5	4	[]	0	t	2026-05-06 16:15:27.428+09	0	\N	2026-05-06 16:15:27.428584+09	2026-05-06 16:26:24.492606+09
46	2	0.00	2026-05-06 17:05:24.129+09	5	1	[]	0	t	2026-05-06 16:50:26.323+09	0	\N	2026-05-06 16:50:26.324167+09	2026-05-06 17:05:25.132222+09
35	1	0.00	2026-05-06 17:05:39.783+09	5	1	[]	0	f	\N	21	\N	2026-05-06 00:03:12.513744+09	2026-05-06 17:05:39.834357+09
48	1	0.00	2026-05-11 23:28:04.164+09	6	2	[]	0	t	2026-05-07 20:58:38.138+09	0	\N	2026-05-07 20:58:38.139554+09	2026-05-11 23:28:06.558069+09
49	1	0.00	2026-05-12 00:43:04.3+09	5	2	[]	0	f	\N	3	\N	2026-05-11 23:28:39.621376+09	2026-05-12 00:43:04.373468+09
51	1	0.00	2026-05-13 08:12:57.867+09	5	2	[]	0	t	2026-05-12 13:30:55.951+09	24	\N	2026-05-12 12:41:03.658+09	2026-05-13 08:12:59.129252+09
50	1	0.00	2026-05-12 12:35:55.379+09	5	2	[]	0	f	\N	2129	\N	2026-05-12 00:43:15.164242+09	2026-05-12 12:35:58.955392+09
56	1	0.00	2026-05-13 22:43:56.841+09	3	1	[]	0	t	2026-05-13 22:15:01.841+09	0	\N	2026-05-13 22:15:01.842168+09	2026-05-13 22:43:57.705641+09
52	1	0.00	2026-05-13 15:14:11.513+09	5	1	[]	0	t	2026-05-13 08:18:12.06+09	-660	\N	2026-05-13 08:35:03.081+09	2026-05-13 15:14:11.586897+09
53	2	0.00	\N	3	1	[]	1	t	2026-05-13 15:14:15.287+09	0	\N	2026-05-13 15:14:15.288342+09	2026-05-13 15:26:02.822051+09
54	1	0.00	2026-05-13 22:12:31.942+09	5	1	[]	0	t	2026-05-13 15:28:20.799+09	0	\N	2026-05-13 15:28:20.800443+09	2026-05-13 22:12:32.026982+09
55	1	0.00	2026-05-13 22:14:53.902+09	6	1	[]	0	t	2026-05-13 22:12:35.5+09	0	\N	2026-05-13 22:12:35.501163+09	2026-05-13 22:14:54.018118+09
57	1	0.00	2026-05-13 23:14:20.829+09	3	1	[]	0	t	2026-05-13 22:44:14.324+09	0	\N	2026-05-13 22:44:14.325809+09	2026-05-13 23:14:20.917389+09
58	1	0.00	\N	4	1	[]	1	t	2026-05-13 23:14:24.467+09	0	\N	2026-05-13 23:14:24.468081+09	2026-05-13 23:14:24.468081+09
\.


--
-- Data for Name: shift; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.shift (id, cast_id, date, created_at, updated_at) FROM stdin;
1	6	2026-03-04	2026-03-06 09:23:24.254086+09	2026-03-06 09:23:24.254086+09
2	6	2026-03-08	2026-03-06 09:23:27.4224+09	2026-03-06 09:23:27.4224+09
3	4	2026-03-09	2026-03-06 09:23:30.326803+09	2026-03-06 09:23:30.326803+09
4	4	2026-03-05	2026-03-06 09:23:34.004708+09	2026-03-06 09:23:34.004708+09
5	6	2026-05-04	2026-05-05 10:15:44.985838+09	2026-05-05 10:15:44.985838+09
6	5	2026-05-10	2026-05-05 10:15:47.986408+09	2026-05-05 10:15:47.986408+09
7	4	2026-05-07	2026-05-05 10:15:51.730491+09	2026-05-05 10:15:51.730491+09
8	5	2026-05-04	2026-05-05 10:16:15.114294+09	2026-05-05 10:16:15.114294+09
9	6	2026-05-07	2026-05-05 10:16:18.55409+09	2026-05-05 10:16:18.55409+09
10	5	2026-05-06	2026-05-05 10:16:20.920579+09	2026-05-05 10:16:20.920579+09
11	6	2026-05-09	2026-05-05 10:16:24.602279+09	2026-05-05 10:16:24.602279+09
12	5	2026-05-08	2026-05-05 10:16:27.913927+09	2026-05-05 10:16:27.913927+09
13	6	2026-05-06	2026-05-05 10:16:34.395131+09	2026-05-05 10:16:34.395131+09
14	3	2026-05-05	2026-05-05 10:16:42.418512+09	2026-05-05 10:16:42.418512+09
15	7	2026-05-05	2026-05-05 10:16:45.306417+09	2026-05-05 10:16:45.306417+09
16	7	2026-05-08	2026-05-05 10:16:51.625227+09	2026-05-05 10:16:51.625227+09
17	3	2026-05-06	2026-05-05 10:16:55.04318+09	2026-05-05 10:16:55.04318+09
18	4	2026-05-05	2026-05-05 10:17:05.378068+09	2026-05-05 10:17:05.378068+09
19	3	2026-05-09	2026-05-05 10:17:08.731394+09	2026-05-05 10:17:08.731394+09
20	19	2026-05-12	2026-05-12 13:10:00.441597+09	2026-05-12 13:10:00.441597+09
21	17	2026-05-12	2026-05-12 13:10:03.527039+09	2026-05-12 13:10:03.527039+09
22	15	2026-05-12	2026-05-12 13:10:06.681721+09	2026-05-12 13:10:06.681721+09
23	7	2026-05-12	2026-05-12 13:10:10.208405+09	2026-05-12 13:10:10.208405+09
24	3	2026-05-12	2026-05-12 13:16:26.4587+09	2026-05-12 13:16:26.4587+09
\.


--
-- Data for Name: song_room; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.song_room (id, name, status, other, session_id, created_at, updated_at) FROM stdin;
1	Song-A	1	\N	43	2026-05-05 01:59:10.374009+09	2026-05-06 16:05:05.484514+09
2	Song-B	0	\N	\N	2026-05-05 02:00:05.341224+09	2026-05-07 20:58:16.546777+09
\.


--
-- Data for Name: table; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public."table" (id, name, capacity, other, created_at, updated_at) FROM stdin;
1	テーブル1	2	VIP席	2026-02-25 17:15:51.691707+09	2026-02-25 17:15:51.691707+09
2	テーブル2	2	一般席	2026-02-25 17:15:51.691707+09	2026-02-25 17:15:51.691707+09
3	テーブル3	2	カップル席	2026-02-25 17:15:51.691707+09	2026-02-25 17:15:51.691707+09
4	テーブル4	2	グループ席	2026-02-25 17:15:51.691707+09	2026-02-25 17:15:51.691707+09
5	テーブル5	2	一般席	2026-02-25 17:15:51.691707+09	2026-02-25 17:15:51.691707+09
6	テーブル1	2	VIP席	2026-02-25 17:42:11.161352+09	2026-02-25 17:42:11.161352+09
7	テーブル2	2	一般席	2026-02-25 17:42:11.161352+09	2026-02-25 17:42:11.161352+09
8	テーブル3	2	カップル席	2026-02-25 17:42:11.161352+09	2026-02-25 17:42:11.161352+09
9	テーブル4	2	グループ席	2026-02-25 17:42:11.161352+09	2026-02-25 17:42:11.161352+09
10	テーブル5	2	一般席	2026-02-25 17:42:11.161352+09	2026-02-25 17:42:11.161352+09
14	tabel123	6		2026-05-01 01:03:07.05807+09	2026-05-01 01:03:21.737077+09
22	gjhgj	\N		2026-05-04 08:32:56.089481+09	2026-05-04 08:32:56.089481+09
\.


--
-- Data for Name: user; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public."user" (id, name, mail, password, role, food_back, drink_back, main_nomination, inside_nomination, together_nomination, hourly_price, other, attendance_status, created_at, updated_at, gender) FROM stdin;
2	システム管理者	admin@example.com	b161b045b298f9abb4e4767d839c4bbe	super_admin	0.00	0.00	0.00	0.00	0.00	0.00		0	2026-02-25 17:42:11.160349+09	2026-02-25 17:42:11.160349+09	\N
9	admin2	admin2@example.com	c84258e9c39059a89ab77d846ddab909	admin	0.00	0.00	0.00	0.00	0.00	0.00		0	2026-02-25 18:11:47.978427+09	2026-02-25 18:11:47.978427+09	male
8	admin1	admin1@example.com	e00cf25ad42683b3df678c61f42c6bda	admin	0.00	0.00	0.00	0.00	0.00	0.00		0	2026-02-25 18:11:27.398251+09	2026-02-25 18:12:02.131972+09	male
10	table1	table1@example.com	270e33da79c5156c1ba3b42cbc190c6c	table	0.00	0.00	0.00	0.00	0.00	0.00		0	2026-02-25 18:12:21.864178+09	2026-02-25 18:12:21.864178+09	\N
11	table2	table2@example.com	11c80bb6e72888f484b846399c2d5e45	table	0.00	0.00	0.00	0.00	0.00	0.00		0	2026-02-25 18:12:44.39673+09	2026-02-25 18:12:53.135577+09	other
12	table3	table3@example.com	a4d3e519fe9fd7d2434e4f0f279f8155	table	0.00	0.00	0.00	0.00	0.00	0.00		0	2026-02-25 18:13:18.61353+09	2026-02-25 18:13:18.61353+09	\N
4	hiro	hiro@example.com	3f5215d48e31231d3da0a4bf858afa65	cast	0.00	0.00	15.00	40.00	30.00	1900.00		1	2026-02-25 18:03:26.441816+09	2026-05-13 12:33:00.517643+09	female
5	taro	taro@example.com	3886bc9c9655241c5737d45eec5447bb	cast	0.00	0.00	15.00	40.00	30.00	1700.00		0	2026-02-25 18:03:52.025044+09	2026-05-13 12:33:00.517643+09	male
6	momo	momo@example.com	06c56a89949d617def52f371c357b6db	cast	0.00	0.00	15.00	40.00	30.00	1900.00		0	2026-02-25 18:04:55.774071+09	2026-05-13 12:33:00.517643+09	female
13	tewt	twetwe@example.com	5cd4ba1360dc974e9241a5f8ff9c632f	cast	0.00	0.00	15.00	0.00	0.00	0.00		0	2026-05-05 14:17:40.688915+09	2026-05-13 12:33:00.517643+09	\N
14	ererty	ereye@example.com	04a4f99a41e251ae24cbff2e604ad59b	cast	0.00	0.00	15.00	0.00	0.00	0.00		0	2026-05-05 14:17:49.687043+09	2026-05-13 12:33:00.517643+09	\N
16	vbvb	vbnvbn@example.com	8bbc2b904d0f41c51ae92c2268935b03	cast	0.00	0.00	15.00	0.00	0.00	0.00		0	2026-05-05 14:18:11.464763+09	2026-05-13 12:33:00.517643+09	\N
18	ertj	rtyj@example.com	b161b045b298f9abb4e4767d839c4bbe	cast	0.00	0.00	15.00	0.00	0.00	0.00		0	2026-05-05 14:18:31.601296+09	2026-05-13 12:33:00.517643+09	\N
3	hana	hana@example.com	52fd46504e1b86d80cfa22c0a1168a9d	cast	0.00	0.00	15.00	40.00	30.00	1700.00		0	2026-02-25 18:02:46.303976+09	2026-05-18 00:00:00.103091+09	female
7	sato	sato@example.com	47ee51d3a36176c6b3b49691393952fc	cast	0.00	0.00	15.00	40.00	30.00	1700.00		0	2026-02-25 18:05:12.842746+09	2026-05-18 00:00:00.117656+09	male
15	fg	ghh@example.com	19b19ffc30caef1c9376cd2982992a59	cast	0.00	0.00	15.00	0.00	0.00	1700.00		0	2026-05-05 14:18:00.713902+09	2026-05-18 00:00:00.118586+09	\N
17	kytj	tyju@example.com	b161b045b298f9abb4e4767d839c4bbe	cast	0.00	0.00	15.00	0.00	0.00	1700.00		0	2026-05-05 14:18:21.587297+09	2026-05-18 00:00:00.119169+09	\N
19	vbnj	vbnj@example.com	b161b045b298f9abb4e4767d839c4bbe	cast	0.00	0.00	15.00	0.00	0.00	1700.00		0	2026-05-05 14:18:40.602026+09	2026-05-18 00:00:00.119946+09	\N
\.


--
-- Data for Name: vip_room; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.vip_room (id, name, status, other, session_id, created_at, updated_at, price) FROM stdin;
1	VIP-A	1	ASD	43	2026-05-05 01:58:50.929192+09	2026-05-14 01:52:36.289886+09	2500.00
2	VIP-B	1	\N	58	2026-05-05 01:59:33.174676+09	2026-05-14 01:58:31.578858+09	2100.00
3	VIP-C	1	\N	58	2026-05-05 01:59:43.967363+09	2026-05-14 01:58:48.214902+09	3600.00
\.


--
-- Name: add_charges_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.add_charges_id_seq', 3285, true);


--
-- Name: additional_services_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.additional_services_id_seq', 72, true);


--
-- Name: attendance_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.attendance_id_seq', 30, true);


--
-- Name: bottle_keep_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.bottle_keep_id_seq', 1, false);


--
-- Name: callmanager_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.callmanager_id_seq', 1, false);


--
-- Name: category_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.category_id_seq', 5, true);


--
-- Name: deduct_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.deduct_id_seq', 4, true);


--
-- Name: nomination_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.nomination_id_seq', 51, true);


--
-- Name: notifications_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.notifications_id_seq', 50, true);


--
-- Name: product_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.product_id_seq', 26, true);


--
-- Name: project_variable_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.project_variable_id_seq', 9548, true);


--
-- Name: salary_attenday_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.salary_attenday_id_seq', 14, true);


--
-- Name: salary_category_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.salary_category_id_seq', 38, true);


--
-- Name: salary_daily_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.salary_daily_id_seq', 25, true);


--
-- Name: salary_full_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.salary_full_id_seq', 1, true);


--
-- Name: salary_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.salary_id_seq', 1648, true);


--
-- Name: salesorder_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.salesorder_id_seq', 50, true);


--
-- Name: serviceorder_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.serviceorder_id_seq', 1, false);


--
-- Name: services_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.services_id_seq', 1, false);


--
-- Name: session_item_overrides_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.session_item_overrides_id_seq', 1, false);


--
-- Name: session_payments_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.session_payments_id_seq', 1, false);


--
-- Name: sessions_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.sessions_id_seq', 58, true);


--
-- Name: shift_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.shift_id_seq', 24, true);


--
-- Name: song_room_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.song_room_id_seq', 2, true);


--
-- Name: table_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.table_id_seq', 22, true);


--
-- Name: user_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.user_id_seq', 19, true);


--
-- Name: vip_room_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.vip_room_id_seq', 3, true);


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
-- Name: deduct deduct_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.deduct
    ADD CONSTRAINT deduct_pkey PRIMARY KEY (id);


--
-- Name: nomination nomination_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.nomination
    ADD CONSTRAINT nomination_pkey PRIMARY KEY (id);


--
-- Name: notifications notifications_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.notifications
    ADD CONSTRAINT notifications_pkey PRIMARY KEY (id);


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
-- Name: salary_daily salary_daily_date_user_id_key; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.salary_daily
    ADD CONSTRAINT salary_daily_date_user_id_key UNIQUE (date, user_id);


--
-- Name: salary_daily salary_daily_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.salary_daily
    ADD CONSTRAINT salary_daily_pkey PRIMARY KEY (id);


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
-- Name: session_item_overrides session_item_overrides_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.session_item_overrides
    ADD CONSTRAINT session_item_overrides_pkey PRIMARY KEY (id);


--
-- Name: session_item_overrides session_item_overrides_session_id_item_key_key; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.session_item_overrides
    ADD CONSTRAINT session_item_overrides_session_id_item_key_key UNIQUE (session_id, item_key);


--
-- Name: session_payments session_payments_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.session_payments
    ADD CONSTRAINT session_payments_pkey PRIMARY KEY (id);


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
-- Name: song_room song_room_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.song_room
    ADD CONSTRAINT song_room_pkey PRIMARY KEY (id);


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
-- Name: vip_room vip_room_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.vip_room
    ADD CONSTRAINT vip_room_pkey PRIMARY KEY (id);


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
-- Name: idx_deduct_date; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_deduct_date ON public.deduct USING btree (date);


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
-- Name: idx_notifications_created_at; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_notifications_created_at ON public.notifications USING btree (created_at);


--
-- Name: idx_notifications_priority; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_notifications_priority ON public.notifications USING btree (priority);


--
-- Name: idx_notifications_status; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_notifications_status ON public.notifications USING btree (status);


--
-- Name: idx_notifications_table_id; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_notifications_table_id ON public.notifications USING btree (table_id);


--
-- Name: idx_notifications_type; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_notifications_type ON public.notifications USING btree (type);


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
-- Name: idx_salary_daily_date; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_salary_daily_date ON public.salary_daily USING btree (date);


--
-- Name: idx_salary_daily_date_user; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_salary_daily_date_user ON public.salary_daily USING btree (date, user_id);


--
-- Name: idx_salary_daily_user_id; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_salary_daily_user_id ON public.salary_daily USING btree (user_id);


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
-- Name: idx_session_payments_created_at; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_session_payments_created_at ON public.session_payments USING btree (created_at);


--
-- Name: idx_session_payments_session_id; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_session_payments_session_id ON public.session_payments USING btree (session_id);


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
-- Name: idx_song_room_session_id; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_song_room_session_id ON public.song_room USING btree (session_id);


--
-- Name: idx_song_room_status; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_song_room_status ON public.song_room USING btree (status);


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
-- Name: idx_vip_room_session_id; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_vip_room_session_id ON public.vip_room USING btree (session_id);


--
-- Name: idx_vip_room_status; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_vip_room_status ON public.vip_room USING btree (status);


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
-- Name: deduct update_deduct_updated_at; Type: TRIGGER; Schema: public; Owner: postgres
--

CREATE TRIGGER update_deduct_updated_at BEFORE UPDATE ON public.deduct FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: nomination update_nomination_updated_at; Type: TRIGGER; Schema: public; Owner: postgres
--

CREATE TRIGGER update_nomination_updated_at BEFORE UPDATE ON public.nomination FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: notifications update_notifications_updated_at; Type: TRIGGER; Schema: public; Owner: postgres
--

CREATE TRIGGER update_notifications_updated_at BEFORE UPDATE ON public.notifications FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


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
-- Name: salary_daily update_salary_daily_updated_at; Type: TRIGGER; Schema: public; Owner: postgres
--

CREATE TRIGGER update_salary_daily_updated_at BEFORE UPDATE ON public.salary_daily FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: salary_full update_salary_full_updated_at; Type: TRIGGER; Schema: public; Owner: postgres
--

CREATE TRIGGER update_salary_full_updated_at BEFORE UPDATE ON public.salary_full FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: salary update_salary_updated_at; Type: TRIGGER; Schema: public; Owner: postgres
--

CREATE TRIGGER update_salary_updated_at BEFORE UPDATE ON public.salary FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


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
-- Name: session_payments update_session_payments_updated_at; Type: TRIGGER; Schema: public; Owner: postgres
--

CREATE TRIGGER update_session_payments_updated_at BEFORE UPDATE ON public.session_payments FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


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
-- Name: salary_daily salary_daily_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.salary_daily
    ADD CONSTRAINT salary_daily_user_id_fkey FOREIGN KEY (user_id) REFERENCES public."user"(id) ON DELETE CASCADE;


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
-- Name: session_item_overrides session_item_overrides_session_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.session_item_overrides
    ADD CONSTRAINT session_item_overrides_session_id_fkey FOREIGN KEY (session_id) REFERENCES public.sessions(id) ON DELETE CASCADE;


--
-- Name: session_payments session_payments_session_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.session_payments
    ADD CONSTRAINT session_payments_session_id_fkey FOREIGN KEY (session_id) REFERENCES public.sessions(id) ON DELETE CASCADE;


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
-- Name: song_room song_room_session_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.song_room
    ADD CONSTRAINT song_room_session_id_fkey FOREIGN KEY (session_id) REFERENCES public.sessions(id) ON DELETE SET NULL;


--
-- Name: vip_room vip_room_session_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.vip_room
    ADD CONSTRAINT vip_room_session_id_fkey FOREIGN KEY (session_id) REFERENCES public.sessions(id) ON DELETE SET NULL;


--
-- PostgreSQL database dump complete
--

\unrestrict JuhqUrXQkA32JPiTfVnqHsWbdo6hy7egBHoJVZhgaTuIPgW7OcS9kqSbKohlWI2

