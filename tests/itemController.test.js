const ItemController = require('../controllers/itemController');
const ItemRepository = require('../repositories/ItemRepository');

jest.mock('../repositories/ItemRepository');

describe('ItemController', () => {
  let req, res;

  beforeEach(() => {
    req = {
      params: {},
      body: {}
    };
    res = {
      json: jest.fn(),
      status: jest.fn().mockReturnThis(),
      redirect: jest.fn(),
      send: jest.fn()
    };
    jest.clearAllMocks();
  });

  describe('getItemEdit', () => {
    test('returns item data when item exists', () => {
      const mockItem = {
        item_id: 'itm_1',
        item_name: 'Test Item',
        amount: 5,
        yellow: 1,
        green: 3,
        purple: 6
      };
      
      req.params.itemId = 'itm_1';
      ItemRepository.findById.mockReturnValue(mockItem);

      ItemController.getItemEdit(req, res);

      expect(ItemRepository.findById).toHaveBeenCalledWith('itm_1');
      expect(res.json).toHaveBeenCalledWith(mockItem);
    });

    test('returns 404 when item not found', () => {
      req.params.itemId = 'nonexistent';
      ItemRepository.findById.mockReturnValue(null);

      ItemController.getItemEdit(req, res);

      expect(res.status).toHaveBeenCalledWith(404);
      expect(res.json).toHaveBeenCalledWith({ error: 'アイテムが見つかりません' });
    });

    test('handles database errors', () => {
      req.params.itemId = 'itm_1';
      ItemRepository.findById.mockImplementation(() => {
        throw new Error('Database error');
      });

      const consoleSpy = jest.spyOn(console, 'error').mockImplementation();

      ItemController.getItemEdit(req, res);

      expect(res.status).toHaveBeenCalledWith(500);
      expect(res.json).toHaveBeenCalledWith({ error: 'アイテム取得中にエラーが発生しました' });
      expect(consoleSpy).toHaveBeenCalled();

      consoleSpy.mockRestore();
    });
  });

  describe('postEditItem', () => {
    test('successfully updates item and redirects', () => {
      req.params = { locationId: 'loc_1', itemId: 'itm_1' };
      req.body = {
        item_name: 'Updated Item',
        yellow: '2',
        green: '5',
        purple: '10',
        amount: '8'
      };

      ItemRepository.updateItem.mockReturnValue({ changes: 1 });

      ItemController.postEditItem(req, res);

      expect(ItemRepository.updateItem).toHaveBeenCalledWith('itm_1', {
        item_name: 'Updated Item',
        yellow: 2,
        green: 5,
        purple: 10,
        amount: 8,
        status: 'Green', // calculateStatus(8, 2, 5, 10) should return 'Green'
        is_consumable: 0
      });
      expect(res.redirect).toHaveBeenCalledWith('/location/loc_1');
    });

    test('handles invalid input data', () => {
      req.params = { locationId: 'loc_1', itemId: 'itm_1' };
      req.body = {
        item_name: 'Updated Item',
        yellow: 'invalid',
        green: '5',
        purple: '10',
        amount: '8'
      };

      ItemController.postEditItem(req, res);

      // NaN should be handled gracefully
      expect(ItemRepository.updateItem).toHaveBeenCalledWith('itm_1', {
        item_name: 'Updated Item',
        yellow: NaN,
        green: 5,
        purple: 10,
        amount: 8,
        status: 'Red', // calculateStatus with NaN should return 'Red'
        is_consumable: 0
      });
    });

    test('handles database errors during update', () => {
      req.params = { locationId: 'loc_1', itemId: 'itm_1' };
      req.body = {
        item_name: 'Updated Item',
        yellow: '2',
        green: '5',
        purple: '10',
        amount: '8'
      };

      ItemRepository.updateItem.mockImplementation(() => {
        throw new Error('Database error');
      });

      const consoleSpy = jest.spyOn(console, 'error').mockImplementation();

      ItemController.postEditItem(req, res);

      expect(res.status).toHaveBeenCalledWith(500);
      expect(res.send).toHaveBeenCalledWith('アイテム編集中にエラーが発生しました');
      expect(consoleSpy).toHaveBeenCalled();

      consoleSpy.mockRestore();
    });
  });

  describe('calculateStatus function', () => {
    // calculateStatus function is imported from itemController
    const { calculateStatus } = require('../controllers/itemController');

    test('returns correct status based on thresholds', () => {
      expect(calculateStatus(0, 1, 3, 6)).toBe('Red');
      expect(calculateStatus(1, 1, 3, 6)).toBe('Yellow');
      expect(calculateStatus(2, 1, 3, 6)).toBe('Yellow');
      expect(calculateStatus(3, 1, 3, 6)).toBe('Green');
      expect(calculateStatus(5, 1, 3, 6)).toBe('Green');
      expect(calculateStatus(6, 1, 3, 6)).toBe('Purple');
      expect(calculateStatus(10, 1, 3, 6)).toBe('Purple');
    });
  });
});