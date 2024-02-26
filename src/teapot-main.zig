const std = @import("std");
const Teapot = @import("teapot.zig");
const brfs = @import("br_file_system.zig");
const log = @import("log.zig");
extern fn consoleLog(pointer: [*]const u8, length: u32) void;

const image_size: struct { w: usize, h: usize } = .{ .w = 640, .h = 480 };

// 640 x 480 pixels, where each pixel is 4 bytes (rgba)
var image_buffer = std.mem.zeroes([image_size.w * image_size.h * 4]u8);
var teapot: Teapot = undefined;

// The returned pointer will be used as an offset integer to the wasm memory
export fn getImagePointer() [*]u8 {
    return @ptrCast(&image_buffer);
}

pub fn main() void {
    brfs.setFs();
    log.setFn(consoleLogWrapper);
    teapot = Teapot.init() catch unreachable;
}

export fn updateImage(delta_time: f32) void {
    log.log("hello");
    teapot.update(delta_time) catch unreachable;
    const src: [*]Rgb = @ptrCast(teapot.color_buffer.pixels.?);
    const dest = std.mem.bytesAsSlice(Rgba, image_buffer[0..]);

    for (dest, src) |*d, s| {
        d.* = .{
            .r = s.r,
            .g = s.g,
            .b = s.b,
            .a = 255,
        };
    }
}

const Rgb = extern struct {
    r: u8 align(1),
    g: u8 align(1),
    b: u8 align(1),
};

const Rgba = extern struct {
    r: u8 align(1),
    g: u8 align(1),
    b: u8 align(1),
    a: u8 align(1),
};

fn consoleLogWrapper(str: []const u8) void {
    consoleLog(str.ptr, str.len);
}
