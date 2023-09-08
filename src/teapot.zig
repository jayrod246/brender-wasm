const std = @import("std");
const br = @import("brender.zig");
const brender = br.c;
const log = @import("log.zig");
const Self = @This();

color_buffer: *brender.br_pixelmap,
depth_buffer: *brender.br_pixelmap,
world_root: *brender.br_actor,
world_camera: *brender.br_actor,
world_teapot: *brender.br_actor,
width: u32 = def_width,
height: u32 = def_height,

const def_width: u32 = 640;
const def_height: u32 = 480;

const br_color_fmt: c_int = brender.BR_PMT_RGB_888;
const br_depth_fmt: c_int = brender.BR_PMT_DEPTH_16;
const br_depth_match_fmt: c_int = brender.BR_PMMATCH_DEPTH_16;

const BrenderError = error{LoadModelError};

// for brender max resolution
fn max_resolution(width: *usize, height: *usize, max: usize) void {
    if (width.* > max or height.* > max) {
        var aspect: f32 = @floatFromInt(width.*);
        aspect /= @floatFromInt(height.*);
        if (width.* > height.*) {
            height.* = @intFromFloat(@as(f32, @floatFromInt(max)) / aspect);
            width.* = max;
        } else if (width.* < height.*) {
            width.* = @intFromFloat(@as(f32, @floatFromInt(max)) * aspect);
            height.* = max;
        } else {
            width.* = max;
            height.* = max;
        }
    }
}

fn getData(comptime T: type, actor: *brender.br_actor) *T {
    return @ptrCast(@alignCast(actor.type_data));
}

pub fn main() !void {
    var self = try init(null);
    self.resized(640, 480);
    var counter: i32 = 0;
    while (counter < 10) {
        try self.update();
        counter += 1;
    }
    self.deinit();
}

pub fn init() !Self {
    log.log("BRenderBegin");
    br.begin();
    log.log("ZBBegin");
    brender.BrZbBegin(br_color_fmt, br_depth_fmt);
    log.log("ColorBuffer");
    var color_buffer = brender.BrPixelmapAllocate(br_color_fmt, @as(i32, @intCast(def_width)), @as(i32, @intCast(def_height)), null, brender.BR_PMAF_NORMAL);
    log.log("DepthBuffer");
    var depth_buffer = brender.BrPixelmapMatch(color_buffer, br_depth_match_fmt);

    log.log("Teapot Model load");
    var teapot_model = br.Model.load("./assets/teapot.dat") orelse {
        // std.debug.print("unable to load teapot.dat as a model\n", .{});
        return BrenderError.LoadModelError;
    };
    log.log("Teapot Model add");
    teapot_model.add();

    var world_root: *brender.br_actor = brender.BrActorAllocate(brender.BR_ACTOR_NONE, null);
    var world_camera: *brender.br_actor = brender.BrActorAdd(world_root, brender.BrActorAllocate(brender.BR_ACTOR_CAMERA, null));
    var camera_data = getData(brender.br_camera, world_camera);
    camera_data.type = brender.BR_CAMERA_PERSPECTIVE;
    camera_data.field_of_view = br.degrees(30.0).angle;
    camera_data.hither_z = br.scalar(0.2).scalar;
    camera_data.yon_z = br.scalar(40.0).scalar;
    camera_data.aspect = br.div(br.scalar(@as(f32, @floatFromInt(def_width))).scalar, br.scalar(@as(f32, @floatFromInt(def_height))).scalar);
    brender.BrMatrix34Translate(&world_camera.t.t.mat, br.scalar(0.0).scalar, br.scalar(0.0).scalar, br.scalar(3.5).scalar);

    var world_light: *brender.br_actor = brender.BrActorAdd(world_root, brender.BrActorAllocate(brender.BR_ACTOR_LIGHT, null));
    var light_data = getData(brender.br_light, world_light);
    light_data.type = brender.BR_LIGHT_DIRECT;
    light_data.attenuation_c = br.scalar(1.0).scalar;
    brender.BrMatrix34RotateY(&world_light.t.t.mat, br.degrees(45.0).angle);
    brender.BrMatrix34PostRotateZ(&world_light.t.t.mat, br.degrees(45.0).angle);
    brender.BrLightEnable(world_light);

    var mat: *brender.br_material = brender.BrMaterialAllocate(null);
    mat.identifier = null; //"white"

    mat.colour = brender.BR_COLOUR_RGB(255, 255, 255);
    mat.opacity = 255;

    mat.ka = br.ufrac(0.10).ufrac;
    mat.kd = br.ufrac(0.60).ufrac;
    mat.ks = br.ufrac(0.60).ufrac;

    mat.power = br.scalar(50).scalar;

    mat.flags = brender.BR_MATF_LIGHT | brender.BR_MATF_SMOOTH;

    mat.map_transform = .{
        .m = .{
            br.vec2(1, 0).vec2,
            br.vec2(0, 1).vec2,
            br.vec2(0, 0).vec2,
        },
    };

    mat.index_base = 0;
    mat.index_range = 63;
    mat = brender.BrMaterialAdd(mat);

    var world_teapot: *brender.br_actor = brender.BrActorAdd(world_root, brender.BrActorAllocate(brender.BR_ACTOR_MODEL, null));
    world_teapot.model = teapot_model.model;
    world_teapot.material = mat;
    world_teapot.t.type = brender.BR_TRANSFORM_EULER;
    world_teapot.t.t.euler.e.order = brender.BR_EULER_ZXY_S;
    world_teapot.t.t.euler.e.a = br.degrees(-45).angle;
    world_teapot.t.t.euler.e.b = br.degrees(-45).angle;
    world_teapot.t.t.euler.t.v = .{
        0,
        0,
        0,
    };

    return Self{
        .color_buffer = color_buffer,
        .depth_buffer = depth_buffer,
        .world_root = world_root,
        .world_camera = world_camera,
        .world_teapot = world_teapot,
    };
}

pub fn update(self: *Self, delta_time: f32) !void {
    brender.BrPixelmapFill(self.color_buffer, 0x00000000);
    brender.BrPixelmapFill(self.depth_buffer, 0xFFFFFFFF);

    brender.BrZbSceneRender(self.world_root, self.world_camera, self.color_buffer, self.depth_buffer);

    // SDL_UpdateTexture(fb_texture, NULL, color_buffer.pixels, color_buffer.row_bytes);

    // SDL_RenderClear(renderer);
    // SDL_RenderCopy(renderer, fb_texture, NULL, NULL);
    // SDL_RenderPresent(renderer);

    self.world_teapot.t.t.euler.e.a +%= br.degrees(delta_time * 100.0).angle;
    self.world_teapot.t.t.euler.e.b -%= br.degrees(delta_time * 10.0).angle;
}

pub fn resized(self: *Self, width: usize, height: usize) void {
    // TODO: this is borked, need to update width and height on SELF, and cast i32 blah
    var w = width;
    var h = height;
    max_resolution(&w, &h, 2048);

    brender.BrPixelmapFree(self.color_buffer);
    brender.BrPixelmapFree(self.depth_buffer);

    self.color_buffer = brender.BrPixelmapAllocate(br_color_fmt, @as(u16, @intCast(w)), @as(u16, @intCast(h)), null, brender.BR_PMAF_NORMAL);
    self.depth_buffer = brender.BrPixelmapMatch(self.color_buffer, br_depth_match_fmt);

    var camera_data = getData(brender.br_camera, self.world_camera);
    camera_data.aspect = br.div(br.scalar(@as(f32, @floatFromInt(width))).scalar, br.scalar(@as(f32, @floatFromInt(height))).scalar);
}

pub fn deinit(self: *Self) void {
    brender.BrPixelmapFree(self.color_buffer);
    brender.BrPixelmapFree(self.depth_buffer);

    brender.BrZbEnd();
    br.end();
}
