const { validateCreateOrderInput } = require('../src/validators/orderValidator');

function mockRes() {
  const res = {
    statusCode: 200,
    body: null,
    status(code) { this.statusCode = code; return this; },
    json(data) { this.body = data; return this; }
  };
  return res;
}

const tests = [
  {
    name: 'TC01: Thiếu canteenId / canteen',
    body: { items: [{ foodId: '60d5ecb8b5c9c614b8e8b211', quantity: 1 }], dormBlock: 'Khu A', roomNumber: 'P.302', phone: '0901234567' },
    expectedStatus: 400,
    expectedMsg: 'Vui lòng cung cấp ID Căn tin hợp lệ!'
  },
  {
    name: 'TC02: canteenId không hợp lệ (không phải 24 hex)',
    body: { canteenId: '123', items: [{ foodId: '60d5ecb8b5c9c614b8e8b211', quantity: 1 }], dormBlock: 'Khu A', roomNumber: 'P.302', phone: '0901234567' },
    expectedStatus: 400,
    expectedMsg: 'Vui lòng cung cấp ID Căn tin hợp lệ!'
  },
  {
    name: 'TC03: items rỗng',
    body: { canteenId: '60d5ecb8b5c9c614b8e8b210', items: [], dormBlock: 'Khu A', roomNumber: 'P.302', phone: '0901234567' },
    expectedStatus: 400,
    expectedMsg: 'Danh sách món đặt không được để trống!'
  },
  {
    name: 'TC04: quantity nhỏ hơn 1 hoặc không phải số nguyên',
    body: { canteenId: '60d5ecb8b5c9c614b8e8b210', items: [{ foodId: '60d5ecb8b5c9c614b8e8b211', quantity: 0 }], dormBlock: 'Khu A', roomNumber: 'P.302', phone: '0901234567' },
    expectedStatus: 400,
    expectedMsg: 'Số lượng món tại vị trí 1 phải là số nguyên lớn hơn hoặc bằng 1!'
  },
  {
    name: 'TC05: Tòa KTX không hợp lệ (Khu C)',
    body: { canteenId: '60d5ecb8b5c9c614b8e8b210', items: [{ foodId: '60d5ecb8b5c9c614b8e8b211', quantity: 2 }], dormBlock: 'Khu C', roomNumber: 'P.302', phone: '0901234567' },
    expectedStatus: 400,
    expectedMsg: 'Tòa KTX không hợp lệ. Vui lòng chọn Khu A, Khu B hoặc Khu K.'
  },
  {
    name: 'TC06: Số phòng chứa ký tự script độc hại',
    body: { canteenId: '60d5ecb8b5c9c614b8e8b210', items: [{ foodId: '60d5ecb8b5c9c614b8e8b211', quantity: 2 }], dormBlock: 'Khu A', roomNumber: 'P.302<script>', phone: '0901234567' },
    expectedStatus: 400,
    expectedMsg: 'Số phòng KTX chứa ký tự không hợp lệ!'
  },
  {
    name: 'TC07: Số điện thoại không hợp lệ (11 số hoặc không bắt đầu bằng 0)',
    body: { canteenId: '60d5ecb8b5c9c614b8e8b210', items: [{ foodId: '60d5ecb8b5c9c614b8e8b211', quantity: 2 }], dormBlock: 'Khu A', roomNumber: 'P.302', phone: '1234567890' },
    expectedStatus: 400,
    expectedMsg: 'Số điện thoại không hợp lệ! Vui lòng nhập số điện thoại Việt Nam 10 số bắt đầu bằng 0 (vd: 0901234567).'
  },
  {
    name: 'TC08: Ghi chú vượt quá 200 ký tự',
    body: { canteenId: '60d5ecb8b5c9c614b8e8b210', items: [{ foodId: '60d5ecb8b5c9c614b8e8b211', quantity: 2 }], dormBlock: 'Khu A', roomNumber: 'P.302', phone: '0901234567', note: 'A'.repeat(201) },
    expectedStatus: 400,
    expectedMsg: 'Ghi chú không được vượt quá 200 ký tự!'
  },
  {
    name: 'TC09: Dữ liệu hợp lệ -> Đi tiếp next()',
    body: { canteenId: '60d5ecb8b5c9c614b8e8b210', items: [{ foodId: '60d5ecb8b5c9c614b8e8b211', quantity: 2 }], dormBlock: 'Khu A', roomNumber: 'P.302', phone: '0901234567', note: 'Ít cay' },
    expectedStatus: 200,
    expectNext: true
  }
];

let passed = 0;
for (const tc of tests) {
  const req = { body: tc.body };
  const res = mockRes();
  let calledNext = false;
  validateCreateOrderInput(req, res, () => { calledNext = true; });

  if (tc.expectNext) {
    if (calledNext) {
      console.log('PASS:', tc.name);
      passed++;
    } else {
      console.error('FAIL:', tc.name, res.body);
    }
  } else {
    if (res.statusCode === tc.expectedStatus && res.body && res.body.message === tc.expectedMsg) {
      console.log('PASS:', tc.name);
      passed++;
    } else {
      console.error('FAIL:', tc.name, 'Got status:', res.statusCode, 'Body:', res.body);
    }
  }
}

console.log(`Total tests passed: ${passed}/${tests.length}`);
if (passed !== tests.length) {
  process.exit(1);
}
