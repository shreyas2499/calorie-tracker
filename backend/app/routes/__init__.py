from flask import Flask


def register_blueprints(app: Flask) -> None:
    from app.routes.analytics import analytics_bp
    from app.routes.calories import calories_bp
    from app.routes.health import health_bp
    from app.routes.profile import profile_bp
    from app.routes.weight import weight_bp

    for blueprint in (health_bp, profile_bp, calories_bp, weight_bp, analytics_bp):
        app.register_blueprint(blueprint)
