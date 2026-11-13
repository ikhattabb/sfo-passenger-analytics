// Number and date formatting helpers shared by the whole app.

type Maybe = number | null | undefined;

const integer = new Intl.NumberFormat('en-US');

export const formatInt = (v: Maybe): string => (v == null ? '' : integer.format(v));
export const formatPct = (v: Maybe): string => (v == null ? '' : `${v.toFixed(1)}%`);
export const formatSignedPct = (v: Maybe): string => (v == null ? '' : `${v > 0 ? '+' : ''}${v.toFixed(1)}%`);

const MONTH_NAMES = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

// '2019-08' -> 'Aug 2019'
export const formatMonth = (m: string): string => `${MONTH_NAMES[Number(m.slice(5, 7)) - 1]} ${m.slice(0, 4)}`;
