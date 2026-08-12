/**
 * Shared printing utilities
 */

/**
 * Returns true when `value` is a valid IPv4 address (dotted-decimal, 0-255 each octet).
 */
export function isValidIpv4(value: string): boolean {
  const ipv4Pattern =
    /^(25[0-5]|2[0-4]\d|1\d\d|[1-9]?\d)(\.(25[0-5]|2[0-4]\d|1\d\d|[1-9]?\d)){3}$/;
  return ipv4Pattern.test(value.trim());
}
