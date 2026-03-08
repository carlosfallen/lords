fn main() -> Result<(), Box<dyn std::error::Error>> {
    println!("cargo:rerun-if-changed=../../packages/proto/dolphin.proto");
    tonic_prost_build::configure()
        .build_server(true)
        .build_client(true)
        .compile_protos(&["../../packages/proto/dolphin.proto"], &["../../packages/proto"])?;
    Ok(())
}
