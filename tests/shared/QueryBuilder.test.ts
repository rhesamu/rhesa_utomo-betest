import { parseListQuery } from '../../src/shared/QueryBuilder';

const FILTERS = [
  { field: 'fullName', mode: 'text' as const },
  { field: 'role', mode: 'exact' as const },
];
const SORTABLE = ['fullName', 'createdAt'];

describe('parseListQuery', () => {
  describe('filters', () => {
    it('maps an exact field to a plain equality match', () => {
      const { filter } = parseListQuery({ role: 'admin' }, FILTERS, SORTABLE);
      expect(filter).toEqual({ role: 'admin' });
    });

    it('maps a text field to a case-insensitive regex', () => {
      const { filter } = parseListQuery({ fullName: 'ali' }, FILTERS, SORTABLE);
      expect(filter).toEqual({ fullName: { $regex: 'ali', $options: 'i' } });
    });

    it('escapes regex metacharacters so filter input cannot inject a pattern', () => {
      const { filter } = parseListQuery({ fullName: 'a.*b' }, FILTERS, SORTABLE);
      expect(filter).toEqual({ fullName: { $regex: 'a\\.\\*b', $options: 'i' } });
    });

    it('ignores fields that are not declared as filterable', () => {
      const { filter } = parseListQuery({ password: 'secret' }, FILTERS, SORTABLE);
      expect(filter).toEqual({});
    });

    it('ignores empty and non-string values', () => {
      const { filter } = parseListQuery({ role: '   ', fullName: 42 }, FILTERS, SORTABLE);
      expect(filter).toEqual({});
    });
  });

  describe('sorting', () => {
    it('defaults to newest first', () => {
      const { sort } = parseListQuery({}, FILTERS, SORTABLE);
      expect(sort).toEqual({ createdAt: -1 });
    });

    it('sorts ascending by default and descending with a leading dash', () => {
      expect(parseListQuery({ sort: 'fullName' }, FILTERS, SORTABLE).sort).toEqual({ fullName: 1 });
      expect(parseListQuery({ sort: '-fullName' }, FILTERS, SORTABLE).sort).toEqual({
        fullName: -1,
      });
    });

    it('falls back to the default when the field is not whitelisted', () => {
      const { sort } = parseListQuery({ sort: 'password' }, FILTERS, SORTABLE);
      expect(sort).toEqual({ createdAt: -1 });
    });
  });

  describe('pagination', () => {
    it('applies defaults', () => {
      const { page, limit, skip } = parseListQuery({}, FILTERS, SORTABLE);
      expect({ page, limit, skip }).toEqual({ page: 1, limit: 20, skip: 0 });
    });

    it('computes skip from page and limit', () => {
      const { skip } = parseListQuery({ page: '3', limit: '10' }, FILTERS, SORTABLE);
      expect(skip).toBe(20);
    });

    it('clamps limit to the maximum', () => {
      expect(parseListQuery({ limit: '5000' }, FILTERS, SORTABLE).limit).toBe(100);
    });

    it('falls back to defaults for unparseable values rather than producing NaN', () => {
      const { page, limit, skip } = parseListQuery(
        { page: 'abc', limit: 'xyz' },
        FILTERS,
        SORTABLE,
      );
      expect({ page, limit, skip }).toEqual({ page: 1, limit: 20, skip: 0 });
    });

    it('clamps negative values to the minimum instead of producing a negative skip', () => {
      const { page, limit, skip } = parseListQuery({ page: '-2', limit: '-5' }, FILTERS, SORTABLE);
      expect({ page, limit, skip }).toEqual({ page: 1, limit: 1, skip: 0 });
    });
  });
});
