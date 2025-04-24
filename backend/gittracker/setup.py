from setuptools import setup, find_packages

setup(
    name="gittracker",
    version="0.1.0",
    packages=find_packages(),
    install_requires=[
        "flask>=2.0.0",
        "flask-cors>=3.0.0",
    ],
    author="GitTracker Team",
    author_email="info@gittracker.example.com",
    description="Git conflict pre-warning system",
    keywords="git, conflicts, merge, vscode",
    url="https://github.com/example/gittracker",
    classifiers=[
        "Development Status :: 3 - Alpha",
        "Intended Audience :: Developers",
        "Programming Language :: Python :: 3",
        "Programming Language :: Python :: 3.8",
        "Programming Language :: Python :: 3.9",
        "Programming Language :: Python :: 3.10",
    ],
    python_requires=">=3.8",
    entry_points={
        "console_scripts": [
            "gittracker-server=gittracker.server:main",
        ],
    },
)