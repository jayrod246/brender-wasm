pub const c = @cImport({
    @cInclude("brender.h");
});

pub const std = @import("std");
pub const math = std.math;

pub fn begin() void {
    c.BrBegin();
}

pub fn end() void {
    c.BrEnd();
}

pub const Model = struct {
    model: *c.br_model,

    pub fn load(path: []const u8) ?Model {
        var tmp: [255]u8 = undefined;
        tmp[path.len] = 0;
        var pathZ: [:0]u8 = tmp[0..path.len :0];
        std.mem.copy(u8, pathZ, path);
        var model = c.BrModelLoad(&pathZ[0]) orelse return null;
        return .{ .model = model };
    }

    pub fn add(self: *Model) void {
        self.model = c.BrModelAdd(self.model);
    }
};

pub usingnamespace Fixed;

const Fixed = struct {
    // 1 in various fixed point forms
    const BR_ONE_LS = 1 << 16;
    const BR_ONE_LSF = 1 << 15;
    const BR_ONE_LU = 1 << 16;
    const BR_ONE_LUF = 1 << 16;
    const BR_ONE_SS = 1 << 8;
    const BR_ONE_SSF = 1 << 7;
    const BR_ONE_SU = 1 << 8;
    const BR_ONE_SUF = 1 << 8;

    pub const Angle = struct {
        angle: c.br_angle,
    };

    pub const Scalar = struct {
        scalar: c.br_scalar,
    };

    pub const UFrac = struct {
        ufrac: c.br_ufraction,
    };

    pub const Vec2 = struct {
        vec2: [2]c.br_scalar,
    };

    pub fn vec2(a: f32, b: f32) Vec2 {
        return .{
            .vec2 = .{ scalar(a).scalar, scalar(b).scalar },
        };
    }

    pub fn ufrac(n: f32) UFrac {
        return .{ .ufrac = @as(u16, @intFromFloat(if (@as(f32, @floatFromInt(BR_ONE_LUF)) * n >= @as(f32, @floatFromInt(BR_ONE_LUF))) @as(f32, @floatFromInt(BR_ONE_LUF - 1)) else @as(f32, @floatFromInt(BR_ONE_LUF)) * n)) };
    }

    pub fn scalar(n: f32) Scalar {
        return .{ .scalar = @as(i32, @intFromFloat(n * @as(f32, @floatFromInt(BR_ONE_LS)))) };
    }

    inline fn angle(n: f32) Angle {
        var mag = @as(u16, @intCast(@as(u32, @intFromFloat(@abs(n))) % math.maxInt(u16)));
        var angle_value: u16 = 0;
        if (n < 0) {
            angle_value -%= mag;
        } else {
            angle_value +%= mag;
        }
        return .{ .angle = angle_value };
    }

    pub fn degrees(n: f32) Angle {
        return angle(n * 182.0);
    }

    pub fn radians(n: f32) Angle {
        return angle(n * 10430.0);
    }

    pub fn div(a: i32, b: i32) i32 {
        return c.BrFixedDiv(a, b);
    }
};
