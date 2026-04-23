export default function error400() {
  return (
    <div className="d-flex align-items-center justify-content-center vh-100">
      <div className="text-center">
        <h1 className="display-1 fw-bold">400</h1>
        <p className="fs-3">
          <span className="text-danger">Opps!</span> Permission denied.
        </p>
        <p className="lead">You don`&apos;t have the permission to access.</p>
        <a href="/" className="btn btn-primary">
          Go Home
        </a>
      </div>
    </div>
  );
}
