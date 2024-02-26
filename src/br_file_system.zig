const std = @import("std");
const brender = @import("brender.zig").c;
const br_filesystem = brender.br_filesystem;
const io = std.io;
const Error = error{FileNotFound};
const Stream = io.FixedBufferStream([]const u8);

var globalStream: Stream = undefined;
var globalFs: br_filesystem = undefined;

pub fn setFs() void {
    globalFs = .{
        .identifier = undefined,
        .attributes = null,
        .open_read = &openRead,
        .open_write = null,
        .close = &close,
        .eof = &eof,
        .getchr = &getChr,
        .putchr = null,
        .read = &read,
        .write = null,
        .getline = null,
        .putline = null,
        .advance = &advance,
    };
    _ = brender.BrFilesystemSet(&globalFs);
}

fn advance(count: usize, f: ?*anyopaque) callconv(.C) void {
    var reader = @as(*Stream, @ptrCast(@alignCast(f.?))).reader();
    reader.skipBytes(count, .{}) catch {};
}

fn read(buf: ?*anyopaque, size: usize, nelems: u32, f: ?*anyopaque) callconv(.C) usize {
    // logger.log("BrFilesystem Read");

    var reader = @as(*Stream, @ptrCast(@alignCast(f.?))).reader();
    const n = reader.read(@as([*]u8, @ptrCast(buf))[0..(size * nelems)]) catch 0;
    return @as(u32, @intCast(n));
}

fn openRead(name: [*c]u8, n_magics: usize, mode_test: ?*const fn (magics: [*c]u8, n_magics: usize) callconv(.C) i32, mode_result: [*c]i32) callconv(.C) ?*anyopaque {
    // logger.log("BrFilesystem OpenRead");

    const case = std.meta.stringToEnum(enum {
        @"./assets/teapot.dat",
    }, std.mem.span(name)) orelse return null;

    globalStream = switch (case) {
        .@"./assets/teapot.dat" => io.fixedBufferStream(@embedFile("assets/teapot.dat")),
    };

    if (mode_test) |_| {
        _ = n_magics;
        _ = mode_result;
    }

    return &globalStream;
}

fn close(f: ?*anyopaque) callconv(.C) void {
    _ = f;
}

fn eof(f: ?*anyopaque) callconv(.C) i32 {
    const stream = @as(*Stream, @ptrCast(@alignCast(f.?)));
    const result = _eof(stream) catch false;
    return if (result) 0 else 1;
}

fn _eof(stream: *Stream) !bool {
    return try stream.getPos() < try stream.getEndPos();
}

fn getChr(f: ?*anyopaque) callconv(.C) i32 {
    var reader = @as(*Stream, @ptrCast(@alignCast(f.?))).reader();
    return reader.readByte() catch 0;
}
