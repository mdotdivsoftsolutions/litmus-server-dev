"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.PaymentStatus = exports.CollectionStatus = exports.BookingStatus = exports.Permission = exports.UserRole = exports.ApprovalStatus = void 0;
var ApprovalStatus;
(function (ApprovalStatus) {
    ApprovalStatus["PENDING"] = "PENDING";
    ApprovalStatus["APPROVED"] = "APPROVED";
    ApprovalStatus["REJECTED"] = "REJECTED";
})(ApprovalStatus || (exports.ApprovalStatus = ApprovalStatus = {}));
var UserRole;
(function (UserRole) {
    UserRole["USER"] = "USER";
    UserRole["ADMIN"] = "ADMIN";
    UserRole["LAB"] = "LAB";
    UserRole["EMPLOYEE"] = "EMPLOYEE";
    UserRole["LAB_EMPLOYEE"] = "LAB_EMPLOYEE";
})(UserRole || (exports.UserRole = UserRole = {}));
var Permission;
(function (Permission) {
    Permission["MANAGE_EMPLOYEES"] = "MANAGE_EMPLOYEES";
    Permission["MANAGE_LABS"] = "MANAGE_LABS";
    Permission["MANAGE_USERS"] = "MANAGE_USERS";
    Permission["VIEW_BOOKINGS"] = "VIEW_BOOKINGS";
    Permission["MANAGE_BOOKINGS"] = "MANAGE_BOOKINGS";
    Permission["VIEW_PRICING"] = "VIEW_PRICING";
    Permission["VIEW_LEADS"] = "VIEW_LEADS";
    Permission["MANAGE_LAB_PROFILE"] = "MANAGE_LAB_PROFILE";
    Permission["MANAGE_LAB_EMPLOYEES"] = "MANAGE_LAB_EMPLOYEES";
    Permission["VIEW_LAB_BOOKINGS"] = "VIEW_LAB_BOOKINGS";
    Permission["MANAGE_LAB_BOOKINGS"] = "MANAGE_LAB_BOOKINGS";
    Permission["MANAGE_LAB_TESTS"] = "MANAGE_LAB_TESTS";
    Permission["MANAGE_LAB_PACKAGES"] = "MANAGE_LAB_PACKAGES";
})(Permission || (exports.Permission = Permission = {}));
var BookingStatus;
(function (BookingStatus) {
    BookingStatus["PENDING"] = "PENDING";
    BookingStatus["APPROVED"] = "APPROVED";
    BookingStatus["REJECTED"] = "REJECTED";
    BookingStatus["IN_PROGRESS"] = "IN_PROGRESS";
    BookingStatus["COMPLETED"] = "COMPLETED";
    BookingStatus["CANCELLED"] = "CANCELLED";
})(BookingStatus || (exports.BookingStatus = BookingStatus = {}));
var CollectionStatus;
(function (CollectionStatus) {
    CollectionStatus["NOT_REQUIRED"] = "NOT_REQUIRED";
    CollectionStatus["PENDING"] = "PENDING";
    CollectionStatus["ASSIGNED"] = "ASSIGNED";
    CollectionStatus["REACHED"] = "REACHED";
    CollectionStatus["COLLECTED"] = "COLLECTED";
})(CollectionStatus || (exports.CollectionStatus = CollectionStatus = {}));
var PaymentStatus;
(function (PaymentStatus) {
    PaymentStatus["PENDING"] = "PENDING";
    PaymentStatus["SUCCESS"] = "SUCCESS";
    PaymentStatus["FAILED"] = "FAILED";
    PaymentStatus["REFUNDED"] = "REFUNDED";
})(PaymentStatus || (exports.PaymentStatus = PaymentStatus = {}));
