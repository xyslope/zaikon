const ItemRepository = require('../repositories/ItemRepository');
const mockDb = require('../db');

jest.mock('../db', () => {
  return {
    prepare: jest.fn()
  };
});

describe('ItemRepository', () => {
  afterEach(() => {
    jest.clearAllMocks();
  });

  test('getAllItems returns expected data', () => {
    const mockItems = [{ item_id: 'itm_1', item_name: 'Item 1' }];
    mockDb.prepare.mockReturnValue({
      all: jest.fn().mockReturnValue(mockItems),
      run: jest.fn()
    });
    const result = ItemRepository.getAllItems();
    expect(mockDb.prepare).toHaveBeenCalled();
    expect(result).toEqual(mockItems);
  });

  test('addItem executes insert statement', () => {
    const prepareMock = {
      run: jest.fn()
    };
    mockDb.prepare.mockReturnValue(prepareMock);

    const itemData = {
      item_id: 'itm_1',
      item_name: 'Item 1',
      location_id: 'loc_1',
      amount: 10,
      status: 'Green',
      yellow: 1,
      green: 2,
      purple: 3,
      inuse: 0,
      created_at: '2025-01-01T00:00:00Z',
      updated_at: '2025-01-01T00:00:00Z'
    };

    ItemRepository.addItem(itemData);

    expect(mockDb.prepare).toHaveBeenCalled();
    expect(prepareMock.run).toHaveBeenCalledWith(
      itemData.item_id, itemData.item_name, itemData.location_id,
      itemData.amount, itemData.status, itemData.yellow,
      itemData.green, itemData.purple, itemData.inuse,
      itemData.created_at, itemData.updated_at
    );
  });

  test('updateItemAmount executes update', () => {
    const runMock = jest.fn();
    mockDb.prepare.mockReturnValue({ run: runMock });

    ItemRepository.updateItemAmount('itm_1', 5);

    expect(mockDb.prepare).toHaveBeenCalled();
    expect(runMock).toHaveBeenCalledWith(5, 'itm_1');
  });

  test('updateAmount executes update', () => {
    const runMock = jest.fn();
    mockDb.prepare.mockReturnValue({ run: runMock });

    ItemRepository.updateAmount('itm_1', 7);

    expect(mockDb.prepare).toHaveBeenCalled();
    expect(runMock).toHaveBeenCalledWith(7, 'itm_1');
  });

  test('getItemsByLocation returns items', () => {
    const mockItems = [{ item_id: 'itm_1' }];
    mockDb.prepare.mockReturnValue({
      all: jest.fn().mockReturnValue(mockItems)
    });

    const result = ItemRepository.getItemsByLocation('loc_1');

    expect(mockDb.prepare).toHaveBeenCalled();
    expect(result).toEqual(mockItems);
  });

  test('findByLocationId returns items or empty array', () => {
    const mockItems = [{ item_id: 'itm_2' }];
    mockDb.prepare.mockReturnValue({
      all: jest.fn().mockReturnValue(mockItems)
    });
    const result = ItemRepository.findByLocationId('loc_2');
    expect(result).toEqual(mockItems);

    // test empty case
    mockDb.prepare.mockReturnValue({
      all: jest.fn().mockReturnValue(null)
    });
    const resultEmpty = ItemRepository.findByLocationId('loc_3');
    expect(resultEmpty).toEqual([]);
  });

  test('updateInuseAndAmount executes update', () => {
    const runMock = jest.fn();
    mockDb.prepare.mockReturnValue({ run: runMock });
    ItemRepository.updateInuseAndAmount('itm_1', 1, 2);
    expect(runMock).toHaveBeenCalledWith(1, 2, 'itm_1');
  });

  test('updateInuse executes update', () => {
    const runMock = jest.fn();
    mockDb.prepare.mockReturnValue({ run: runMock });
    ItemRepository.updateInuse('itm_1', 2);
    expect(runMock).toHaveBeenCalledWith(2, 'itm_1');
  });

  test('updateItem executes full item update', () => {
    const runMock = jest.fn();
    mockDb.prepare.mockReturnValue({ run: runMock });

    const itemData = {
      item_name: 'Updated Item',
      yellow: 2,
      green: 5,
      purple: 10,
      amount: 8,
      status: 'Green'
    };

    ItemRepository.updateItem('itm_1', itemData);

    expect(mockDb.prepare).toHaveBeenCalled();
    expect(runMock).toHaveBeenCalledWith(
      itemData.item_name,
      itemData.yellow,
      itemData.green,
      itemData.purple,
      itemData.amount,
      itemData.status,
      'itm_1'
    );
  });

  test('findById returns item or null', () => {
    const mockItem = { item_id: 'itm_1', item_name: 'Test Item' };
    mockDb.prepare.mockReturnValue({
      get: jest.fn().mockReturnValue(mockItem)
    });

    const result = ItemRepository.findById('itm_1');
    expect(result).toEqual(mockItem);

    // test null case
    mockDb.prepare.mockReturnValue({
      get: jest.fn().mockReturnValue(undefined)
    });
    const resultNull = ItemRepository.findById('nonexistent');
    expect(resultNull).toBeNull();
  });

  test('delete executes delete statement', () => {
    const runMock = jest.fn();
    mockDb.prepare.mockReturnValue({ run: runMock });

    ItemRepository.delete('itm_1');

    expect(mockDb.prepare).toHaveBeenCalled();
    expect(runMock).toHaveBeenCalledWith('itm_1');
  });

  test('findItemsByUserWithConditions builds query correctly', () => {
    const mockItems = [{ item_id: 'itm_1' }];
    const allMock = jest.fn().mockReturnValue(mockItems);
    mockDb.prepare.mockReturnValue({ all: allMock });

    // no optional params
    let res = ItemRepository.findItemsByUserWithConditions('usr_1');
    expect(mockDb.prepare).toHaveBeenCalled();
    expect(allMock).toHaveBeenCalled();

    // with inuse
    res = ItemRepository.findItemsByUserWithConditions('usr_1', 1);
    expect(mockDb.prepare).toHaveBeenCalled();

    // with inuse and status
    res = ItemRepository.findItemsByUserWithConditions('usr_1', 1, 'Red');
    expect(mockDb.prepare).toHaveBeenCalled();
  });
});