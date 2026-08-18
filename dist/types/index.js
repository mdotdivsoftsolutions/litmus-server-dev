"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.MessageSenderType = exports.ChatUserType = exports.ChatSessionStatus = exports.PaymentStatus = exports.CollectionStatus = exports.BookingStatus = exports.Permission = exports.UserRole = exports.ApprovalStatus = void 0;
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
    Permission["MANAGE_SUPPORT_CHAT"] = "MANAGE_SUPPORT_CHAT";
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
    CollectionStatus["SHIPPED"] = "SHIPPED";
})(CollectionStatus || (exports.CollectionStatus = CollectionStatus = {}));
var PaymentStatus;
(function (PaymentStatus) {
    PaymentStatus["PENDING"] = "PENDING";
    PaymentStatus["SUCCESS"] = "SUCCESS";
    PaymentStatus["FAILED"] = "FAILED";
    PaymentStatus["REFUND_INITIATED"] = "REFUND_INITIATED";
    PaymentStatus["REFUNDED"] = "REFUNDED";
})(PaymentStatus || (exports.PaymentStatus = PaymentStatus = {}));
var ChatSessionStatus;
(function (ChatSessionStatus) {
    ChatSessionStatus["BOT"] = "BOT";
    ChatSessionStatus["QUEUED"] = "QUEUED";
    ChatSessionStatus["ACTIVE"] = "ACTIVE";
    ChatSessionStatus["RESOLVED"] = "RESOLVED";
    ChatSessionStatus["MISSED"] = "MISSED";
    ChatSessionStatus["CLOSED"] = "CLOSED";
})(ChatSessionStatus || (exports.ChatSessionStatus = ChatSessionStatus = {}));
var ChatUserType;
(function (ChatUserType) {
    ChatUserType["REGISTERED"] = "REGISTERED";
    ChatUserType["GUEST"] = "GUEST";
})(ChatUserType || (exports.ChatUserType = ChatUserType = {}));
var MessageSenderType;
(function (MessageSenderType) {
    MessageSenderType["USER"] = "USER";
    MessageSenderType["AGENT"] = "AGENT";
    MessageSenderType["BOT"] = "BOT";
    MessageSenderType["SYSTEM"] = "SYSTEM";
})(MessageSenderType || (exports.MessageSenderType = MessageSenderType = {}));
