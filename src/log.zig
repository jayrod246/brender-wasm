var logger: ?*const fn (str: []const u8) void = null;

pub fn setFn(comptime newLogger: ?fn (str: []const u8) void) void {
    logger = newLogger orelse null;
}

pub inline fn log(str: []const u8) void {
    if (logger) |l| l(str);
}
