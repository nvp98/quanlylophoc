// Gender constants
export const GENDER = {
  MALE: "male",
  FEMALE: "female",
};

export const GENDER_OPTIONS = [
  { label: "Nam", value: GENDER.MALE },
  { label: "Nữ", value: GENDER.FEMALE },
];

// Status constants
export const STATUS = {
  ACTIVE: "active",
  INACTIVE: "inactive",
  GRADUATED: "graduated",
};

export const STATUS_OPTIONS = [
  { label: "Hoạt động", value: STATUS.ACTIVE },
  { label: "Không hoạt động", value: STATUS.INACTIVE },
  { label: "Tốt nghiệp", value: STATUS.GRADUATED },
];

// Attendance status
export const ATTENDANCE_STATUS = {
  PRESENT: "present",
  ABSENT: "absent",
  LATE: "late",
  EXCUSED: "excused",
};

export const ATTENDANCE_STATUS_OPTIONS = [
  { label: "Có mặt", value: ATTENDANCE_STATUS.PRESENT },
  { label: "Vắng mặt", value: ATTENDANCE_STATUS.ABSENT },
  { label: "Đi trễ", value: ATTENDANCE_STATUS.LATE },
  { label: "Vắng có phép", value: ATTENDANCE_STATUS.EXCUSED },
];

// Payment status
export const PAYMENT_STATUS = {
  PAID: "paid",
  UNPAID: "unpaid",
  PARTIAL: "partial",
};

export const PAYMENT_STATUS_OPTIONS = [
  { label: "Đã thanh toán", value: PAYMENT_STATUS.PAID },
  { label: "Chưa thanh toán", value: PAYMENT_STATUS.UNPAID },
  { label: "Thanh toán một phần", value: PAYMENT_STATUS.PARTIAL },
];
