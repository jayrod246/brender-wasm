const std = @import("std");

// Number of pages reserved for heap memory.
// This must match the number of pages used in script.js.
const number_of_pages = 128;

// Although this function looks imperative, note that its job is to
// declaratively construct a build graph that will be executed by an external
// runner.
pub fn build(b: *std.Build) void {
    const target: std.zig.CrossTarget = .{
        .cpu_arch = .wasm32,
        .os_tag = .wasi,
        .abi = .musl,
    };

    const optimize: std.builtin.OptimizeMode = .ReleaseSmall;

    const brender_dep = b.dependency("brender", .{
        .target = target,
        .optimize = optimize,
    });
    const lib = b.addSharedLibrary(.{
        .name = "teapot",

        // In this case the main source file is merely a path, however, in more
        // complicated build scripts, this could be a generated file.
        .root_source_file = .{ .path = "src/teapot-main.zig" },
        .target = target,
        .optimize = optimize,
    });

    // <https://github.com/ziglang/zig/issues/8633>
    lib.global_base = 6560;
    lib.rdynamic = true;
    lib.import_memory = true;
    lib.stack_size = std.wasm.page_size;

    lib.initial_memory = std.wasm.page_size * number_of_pages;
    lib.max_memory = std.wasm.page_size * number_of_pages;

    lib.wasi_exec_model = .reactor;

    lib.linkLibrary(brender_dep.artifact("brender"));

    // This declares intent for the library to be installed into the standard
    // location when the user invokes the "install" step (the default step when
    // running `zig build`).
    b.installArtifact(lib);
}
